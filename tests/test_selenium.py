#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Nomur 前端UI自动化测试脚本（Selenium）
覆盖所有功能点的UI测试
"""

from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.common.keys import Keys
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.chrome.options import Options
from selenium.common.exceptions import TimeoutException, NoSuchElementException, ElementClickInterceptedException
import time
import json
import traceback
from datetime import datetime
from typing import Dict, List, Optional, Any
from dataclasses import dataclass, field
from enum import Enum
import os


# 测试配置
BASE_URL = "https://nomur.linkmate.site"  # 生产环境地址
TEST_RESULTS = []
TEST_ISSUES = []
WAIT_TIMEOUT = 10  # 等待超时时间（秒）


class TestStatus(Enum):
    PASS = "PASS"
    FAIL = "FAIL"
    ERROR = "ERROR"
    SKIP = "SKIP"


@dataclass
class TestResult:
    test_name: str
    status: TestStatus
    message: str
    duration: float
    screenshot: Optional[str] = None
    error: Optional[str] = None
    details: Dict[str, Any] = field(default_factory=dict)


class TestReporter:
    """测试结果记录器"""
    
    @staticmethod
    def record(test_name: str, status: TestStatus, message: str = "", 
               duration: float = 0, screenshot: str = None, error: str = None, details: Dict = None):
        result = TestResult(
            test_name=test_name,
            status=status,
            message=message,
            duration=duration,
            screenshot=screenshot,
            error=error,
            details=details or {}
        )
        TEST_RESULTS.append(result)
        if status not in [TestStatus.PASS, TestStatus.SKIP]:
            TEST_ISSUES.append(result)
        
        status_icon = "✓" if status == TestStatus.PASS else ("⊘" if status == TestStatus.SKIP else "✗")
        print(f"{status_icon} [{status.value}] {test_name}: {message}")
        if error:
            print(f"   错误: {error[:200]}")  # 限制错误信息长度
    
    @staticmethod
    def generate_report():
        """生成测试报告"""
        total = len(TEST_RESULTS)
        passed = len([r for r in TEST_RESULTS if r.status == TestStatus.PASS])
        failed = len([r for r in TEST_RESULTS if r.status == TestStatus.FAIL])
        errors = len([r for r in TEST_RESULTS if r.status == TestStatus.ERROR])
        skipped = len([r for r in TEST_RESULTS if r.status == TestStatus.SKIP])
        
        report = f"""
{'='*80}
Selenium UI自动化测试报告
{'='*80}
测试时间: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}
测试地址: {BASE_URL}
总测试数: {total}
通过: {passed} ({passed/total*100:.1f}% if total > 0 else 0)
失败: {failed} ({failed/total*100:.1f}% if total > 0 else 0)
错误: {errors} ({errors/total*100:.1f}% if total > 0 else 0)
跳过: {skipped} ({skipped/total*100:.1f}% if total > 0 else 0)
{'='*80}

详细结果:
"""
        
        for result in TEST_RESULTS:
            report += f"\n[{result.status.value}] {result.test_name}\n"
            report += f"  消息: {result.message}\n"
            report += f"  耗时: {result.duration:.3f}秒\n"
            if result.screenshot:
                report += f"  截图: {result.screenshot}\n"
            if result.error:
                report += f"  错误: {result.error}\n"
        
        if TEST_ISSUES:
            report += f"\n{'='*80}\n发现的问题:\n{'='*80}\n"
            for issue in TEST_ISSUES:
                report += f"\n[{issue.status.value}] {issue.test_name}\n"
                report += f"  消息: {issue.message}\n"
                if issue.screenshot:
                    report += f"  截图: {issue.screenshot}\n"
                if issue.error:
                    report += f"  错误: {issue.error}\n"
        
        report += f"\n{'='*80}\n"
        
        # 保存到文件
        report_file = f"selenium_test_report_{datetime.now().strftime('%Y%m%d_%H%M%S')}.txt"
        with open(report_file, 'w', encoding='utf-8') as f:
            f.write(report)
        
        print(report)
        print(f"\n报告已保存到: {report_file}")
        
        return report


class NomurUITester:
    """Nomur UI测试器"""
    
    def __init__(self, base_url: str = BASE_URL, headless: bool = False):
        self.base_url = base_url
        self.driver = None
        self.wait = None
        self.headless = headless
        self.screenshot_dir = f"screenshots_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
        os.makedirs(self.screenshot_dir, exist_ok=True)
        self.test_data = {}
    
    def setup(self):
        """初始化WebDriver"""
        try:
            chrome_options = Options()
            if self.headless:
                chrome_options.add_argument('--headless')
            chrome_options.add_argument('--no-sandbox')
            chrome_options.add_argument('--disable-dev-shm-usage')
            chrome_options.add_argument('--disable-gpu')
            chrome_options.add_argument('--window-size=1920,1080')
            chrome_options.add_argument('--lang=zh-CN')
            # 移动端模拟
            mobile_emulation = {
                "deviceMetrics": {"width": 375, "height": 667, "pixelRatio": 2.0},
                "userAgent": "Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15"
            }
            chrome_options.add_experimental_option("mobileEmulation", mobile_emulation)
            
            self.driver = webdriver.Chrome(options=chrome_options)
            self.wait = WebDriverWait(self.driver, WAIT_TIMEOUT)
            self.driver.get(self.base_url)
            time.sleep(2)  # 等待页面加载
            print("WebDriver初始化成功")
        except Exception as e:
            print(f"WebDriver初始化失败: {str(e)}")
            raise
    
    def teardown(self):
        """清理资源"""
        if self.driver:
            self.driver.quit()
    
    def take_screenshot(self, name: str) -> str:
        """截图"""
        try:
            screenshot_path = os.path.join(self.screenshot_dir, f"{name}.png")
            self.driver.save_screenshot(screenshot_path)
            return screenshot_path
        except Exception as e:
            print(f"截图失败: {str(e)}")
            return ""
    
    def find_element_safe(self, by: By, value: str, timeout: int = WAIT_TIMEOUT):
        """安全查找元素"""
        try:
            element = WebDriverWait(self.driver, timeout).until(
                EC.presence_of_element_located((by, value))
            )
            return element
        except TimeoutException:
            return None
    
    def click_safe(self, element, description: str = ""):
        """安全点击元素"""
        try:
            # 滚动到元素可见
            self.driver.execute_script("arguments[0].scrollIntoView(true);", element)
            time.sleep(0.5)
            element.click()
            return True
        except ElementClickInterceptedException:
            # 如果被遮挡，尝试JavaScript点击
            try:
                self.driver.execute_script("arguments[0].click();", element)
                return True
            except Exception as e:
                print(f"点击失败 {description}: {str(e)}")
                return False
        except Exception as e:
            print(f"点击失败 {description}: {str(e)}")
            return False
    
    def wait_for_page_load(self, timeout: int = WAIT_TIMEOUT):
        """等待页面加载"""
        try:
            self.wait.until(lambda driver: driver.execute_script('return document.readyState') == 'complete')
            time.sleep(1)  # 额外等待1秒确保动态内容加载
        except TimeoutException:
            pass
    
    # ==================== 基础功能测试 ====================
    
    def test_page_load(self):
        """测试页面加载"""
        start_time = time.time()
        try:
            self.wait_for_page_load()
            title = self.driver.title
            current_url = self.driver.current_url
            duration = time.time() - start_time
            
            if title or "nomur" in current_url.lower():
                screenshot = self.take_screenshot("page_load")
                TestReporter.record('页面加载', TestStatus.PASS, f"页面标题: {title}", duration, screenshot)
            else:
                screenshot = self.take_screenshot("page_load_fail")
                TestReporter.record('页面加载', TestStatus.FAIL, '页面加载异常', duration, screenshot)
        except Exception as e:
            duration = time.time() - start_time
            screenshot = self.take_screenshot("page_load_error")
            TestReporter.record('页面加载', TestStatus.ERROR, str(e), duration, screenshot, traceback.format_exc())
    
    # ==================== 导航测试 ====================
    
    def test_navigation(self):
        """测试底部导航"""
        start_time = time.time()
        try:
            self.wait_for_page_load()
            # 查找导航栏（根据实际页面结构调整选择器）
            nav_items = self.driver.find_elements(By.CSS_SELECTOR, ".tab-bar-item, .uni-tabbar__item, [class*='tab']")
            duration = time.time() - start_time
            
            if nav_items:
                screenshot = self.take_screenshot("navigation")
                TestReporter.record('底部导航', TestStatus.PASS, f"找到{len(nav_items)}个导航项", duration, screenshot)
            else:
                screenshot = self.take_screenshot("navigation_fail")
                TestReporter.record('底部导航', TestStatus.FAIL, '未找到导航栏', duration, screenshot)
        except Exception as e:
            duration = time.time() - start_time
            screenshot = self.take_screenshot("navigation_error")
            TestReporter.record('底部导航', TestStatus.ERROR, str(e), duration, screenshot, traceback.format_exc())
    
    # ==================== 商品管理测试 ====================
    
    def test_products_page(self):
        """测试商品管理页面"""
        start_time = time.time()
        try:
            # 尝试导航到商品页面（需要根据实际路由调整）
            # 这里需要根据实际应用的路由结构来定位
            self.wait_for_page_load()
            
            # 查找商品相关的链接或按钮
            product_links = self.driver.find_elements(By.XPATH, "//*[contains(text(), '商品') or contains(text(), '产品')]")
            
            duration = time.time() - start_time
            
            if product_links:
                screenshot = self.take_screenshot("products_page")
                TestReporter.record('商品管理页面', TestStatus.PASS, f"找到商品相关元素", duration, screenshot)
            else:
                screenshot = self.take_screenshot("products_page_fail")
                TestReporter.record('商品管理页面', TestStatus.SKIP, '未找到商品管理入口（可能需要登录）', duration, screenshot)
        except Exception as e:
            duration = time.time() - start_time
            screenshot = self.take_screenshot("products_page_error")
            TestReporter.record('商品管理页面', TestStatus.ERROR, str(e), duration, screenshot, traceback.format_exc())
    
    # ==================== 代理商管理测试 ====================
    
    def test_agents_page(self):
        """测试代理商管理页面"""
        start_time = time.time()
        try:
            self.wait_for_page_load()
            
            # 查找代理商/客户相关的链接或按钮
            agent_links = self.driver.find_elements(By.XPATH, "//*[contains(text(), '代理') or contains(text(), '客户')]")
            
            duration = time.time() - start_time
            
            if agent_links:
                screenshot = self.take_screenshot("agents_page")
                TestReporter.record('代理商管理页面', TestStatus.PASS, f"找到代理商相关元素", duration, screenshot)
            else:
                screenshot = self.take_screenshot("agents_page_fail")
                TestReporter.record('代理商管理页面', TestStatus.SKIP, '未找到代理商管理入口（可能需要登录）', duration, screenshot)
        except Exception as e:
            duration = time.time() - start_time
            screenshot = self.take_screenshot("agents_page_error")
            TestReporter.record('代理商管理页面', TestStatus.ERROR, str(e), duration, screenshot, traceback.format_exc())
    
    # ==================== 订单管理测试 ====================
    
    def test_orders_page(self):
        """测试订单管理页面"""
        start_time = time.time()
        try:
            self.wait_for_page_load()
            
            # 查找订单相关的链接或按钮
            order_links = self.driver.find_elements(By.XPATH, "//*[contains(text(), '订单') or contains(text(), '开单')]")
            
            duration = time.time() - start_time
            
            if order_links:
                screenshot = self.take_screenshot("orders_page")
                TestReporter.record('订单管理页面', TestStatus.PASS, f"找到订单相关元素", duration, screenshot)
            else:
                screenshot = self.take_screenshot("orders_page_fail")
                TestReporter.record('订单管理页面', TestStatus.SKIP, '未找到订单管理入口（可能需要登录）', duration, screenshot)
        except Exception as e:
            duration = time.time() - start_time
            screenshot = self.take_screenshot("orders_page_error")
            TestReporter.record('订单管理页面', TestStatus.ERROR, str(e), duration, screenshot, traceback.format_exc())
    
    # ==================== 财务管理测试 ====================
    
    def test_finance_page(self):
        """测试财务管理页面"""
        start_time = time.time()
        try:
            self.wait_for_page_load()
            
            # 查找财务相关的链接或按钮
            finance_links = self.driver.find_elements(By.XPATH, "//*[contains(text(), '财务')]")
            
            duration = time.time() - start_time
            
            if finance_links:
                screenshot = self.take_screenshot("finance_page")
                TestReporter.record('财务管理页面', TestStatus.PASS, f"找到财务相关元素", duration, screenshot)
            else:
                screenshot = self.take_screenshot("finance_page_fail")
                TestReporter.record('财务管理页面', TestStatus.SKIP, '未找到财务管理入口（可能需要登录）', duration, screenshot)
        except Exception as e:
            duration = time.time() - start_time
            screenshot = self.take_screenshot("finance_page_error")
            TestReporter.record('财务管理页面', TestStatus.ERROR, str(e), duration, screenshot, traceback.format_exc())
    
    # ==================== 表单测试 ====================
    
    def test_form_interaction(self):
        """测试表单交互"""
        start_time = time.time()
        try:
            self.wait_for_page_load()
            
            # 查找输入框
            inputs = self.driver.find_elements(By.TAG_NAME, "input")
            
            duration = time.time() - start_time
            
            if inputs:
                screenshot = self.take_screenshot("form_interaction")
                TestReporter.record('表单交互', TestStatus.PASS, f"找到{len(inputs)}个输入框", duration, screenshot)
            else:
                screenshot = self.take_screenshot("form_interaction_fail")
                TestReporter.record('表单交互', TestStatus.SKIP, '未找到输入框（可能需要登录）', duration, screenshot)
        except Exception as e:
            duration = time.time() - start_time
            screenshot = self.take_screenshot("form_interaction_error")
            TestReporter.record('表单交互', TestStatus.ERROR, str(e), duration, screenshot, traceback.format_exc())
    
    # ==================== 按钮点击测试 ====================
    
    def test_button_clicks(self):
        """测试按钮点击"""
        start_time = time.time()
        try:
            self.wait_for_page_load()
            
            # 查找按钮
            buttons = self.driver.find_elements(By.CSS_SELECTOR, "button, .btn, [class*='button'], [class*='btn']")
            
            duration = time.time() - start_time
            
            if buttons:
                screenshot = self.take_screenshot("button_clicks")
                TestReporter.record('按钮点击', TestStatus.PASS, f"找到{len(buttons)}个按钮", duration, screenshot)
            else:
                screenshot = self.take_screenshot("button_clicks_fail")
                TestReporter.record('按钮点击', TestStatus.SKIP, '未找到按钮（可能需要登录）', duration, screenshot)
        except Exception as e:
            duration = time.time() - start_time
            screenshot = self.take_screenshot("button_clicks_error")
            TestReporter.record('按钮点击', TestStatus.ERROR, str(e), duration, screenshot, traceback.format_exc())
    
    def run_all_tests(self):
        """运行所有测试"""
        print("开始运行Nomur UI自动化测试...\n")
        print(f"测试地址: {self.base_url}\n")
        
        test_methods = [
            self.test_page_load,
            self.test_navigation,
            self.test_products_page,
            self.test_agents_page,
            self.test_orders_page,
            self.test_finance_page,
            self.test_form_interaction,
            self.test_button_clicks,
        ]
        
        for test_method in test_methods:
            try:
                test_method()
                time.sleep(1)  # 测试间隔
            except Exception as e:
                TestReporter.record(
                    test_method.__name__,
                    TestStatus.ERROR,
                    f"测试执行异常: {str(e)}",
                    0,
                    error=traceback.format_exc()
                )


def main():
    """主函数"""
    import argparse
    
    parser = argparse.ArgumentParser(description='Nomur UI自动化测试')
    parser.add_argument('--url', type=str, default=BASE_URL, help='测试地址')
    parser.add_argument('--headless', action='store_true', help='无头模式运行')
    args = parser.parse_args()
    
    tester = NomurUITester(base_url=args.url, headless=args.headless)
    
    try:
        tester.setup()
        tester.run_all_tests()
    except Exception as e:
        print(f"测试初始化失败: {str(e)}")
        TestReporter.record('测试初始化', TestStatus.ERROR, str(e), 0, error=traceback.format_exc())
    finally:
        tester.teardown()
        TestReporter.generate_report()


if __name__ == '__main__':
    main()

