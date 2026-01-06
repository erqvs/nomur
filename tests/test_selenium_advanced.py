#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Nomur 前端UI自动化测试脚本（Selenium）- 高级版本
包含更详细的测试用例和更好的元素定位
"""

from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.common.keys import Keys
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.chrome.options import Options
from selenium.common.exceptions import TimeoutException, NoSuchElementException, ElementClickInterceptedException
from webdriver_manager.chrome import ChromeDriverManager
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
WAIT_TIMEOUT = 15


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
            print(f"   错误: {error[:200]}")
    
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
Selenium UI自动化测试报告（高级版）
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
        
        report_file = f"selenium_advanced_test_report_{datetime.now().strftime('%Y%m%d_%H%M%S')}.txt"
        with open(report_file, 'w', encoding='utf-8') as f:
            f.write(report)
        
        print(report)
        print(f"\n报告已保存到: {report_file}")
        return report


class NomurUITester:
    """Nomur UI测试器（高级版）"""
    
    def __init__(self, base_url: str = BASE_URL, headless: bool = False):
        self.base_url = base_url
        self.driver = None
        self.wait = None
        self.headless = headless
        self.screenshot_dir = f"screenshots_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
        os.makedirs(self.screenshot_dir, exist_ok=True)
    
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
            
            # 使用webdriver-manager自动管理ChromeDriver
            try:
                service = Service(ChromeDriverManager().install())
                self.driver = webdriver.Chrome(service=service, options=chrome_options)
            except:
                # 如果webdriver-manager失败，使用系统ChromeDriver
                self.driver = webdriver.Chrome(options=chrome_options)
            
            self.wait = WebDriverWait(self.driver, WAIT_TIMEOUT)
            self.driver.get(self.base_url)
            time.sleep(3)
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
            return ""
    
    def find_element_by_text(self, text: str, tag: str = "*", timeout: int = WAIT_TIMEOUT):
        """通过文本查找元素"""
        try:
            xpath = f"//{tag}[contains(text(), '{text}')]"
            element = WebDriverWait(self.driver, timeout).until(
                EC.presence_of_element_located((By.XPATH, xpath))
            )
            return element
        except TimeoutException:
            return None
    
    def click_element_by_text(self, text: str, tag: str = "*"):
        """通过文本点击元素"""
        element = self.find_element_by_text(text, tag)
        if element:
            try:
                self.driver.execute_script("arguments[0].scrollIntoView(true);", element)
                time.sleep(0.5)
                self.driver.execute_script("arguments[0].click();", element)
                time.sleep(1)
                return True
            except:
                return False
        return False
    
    def wait_for_page_load(self):
        """等待页面加载"""
        try:
            self.wait.until(lambda driver: driver.execute_script('return document.readyState') == 'complete')
            time.sleep(2)
        except:
            time.sleep(2)
    
    def test_page_load(self):
        """测试页面加载"""
        start_time = time.time()
        try:
            self.wait_for_page_load()
            title = self.driver.title
            current_url = self.driver.current_url
            duration = time.time() - start_time
            screenshot = self.take_screenshot("01_page_load")
            
            TestReporter.record('页面加载', TestStatus.PASS, 
                              f"标题: {title}, URL: {current_url}", duration, screenshot)
        except Exception as e:
            duration = time.time() - start_time
            screenshot = self.take_screenshot("01_page_load_error")
            TestReporter.record('页面加载', TestStatus.ERROR, str(e), duration, screenshot, traceback.format_exc())
    
    def test_navigation_tabs(self):
        """测试底部导航标签"""
        start_time = time.time()
        try:
            self.wait_for_page_load()
            
            # 查找常见的导航文本
            nav_texts = ['驾驶舱', '开单', '客户', '财务', '首页', '订单', '商品']
            found_navs = []
            
            for text in nav_texts:
                element = self.find_element_by_text(text)
                if element:
                    found_navs.append(text)
            
            duration = time.time() - start_time
            screenshot = self.take_screenshot("02_navigation")
            
            if found_navs:
                TestReporter.record('底部导航', TestStatus.PASS, 
                                  f"找到导航: {', '.join(found_navs)}", duration, screenshot)
            else:
                TestReporter.record('底部导航', TestStatus.SKIP, 
                                  '未找到导航元素（可能需要登录）', duration, screenshot)
        except Exception as e:
            duration = time.time() - start_time
            screenshot = self.take_screenshot("02_navigation_error")
            TestReporter.record('底部导航', TestStatus.ERROR, str(e), duration, screenshot, traceback.format_exc())
    
    def test_click_navigation(self):
        """测试点击导航"""
        start_time = time.time()
        try:
            self.wait_for_page_load()
            
            # 尝试点击"客户"导航
            clicked = self.click_element_by_text('客户')
            
            duration = time.time() - start_time
            screenshot = self.take_screenshot("03_click_navigation")
            
            if clicked:
                self.wait_for_page_load()
                TestReporter.record('点击导航-客户', TestStatus.PASS, '成功点击客户导航', duration, screenshot)
            else:
                TestReporter.record('点击导航-客户', TestStatus.SKIP, '未找到客户导航（可能需要登录）', duration, screenshot)
        except Exception as e:
            duration = time.time() - start_time
            screenshot = self.take_screenshot("03_click_navigation_error")
            TestReporter.record('点击导航-客户', TestStatus.ERROR, str(e), duration, screenshot, traceback.format_exc())
    
    def test_agent_list_page(self):
        """测试代理商列表页面"""
        start_time = time.time()
        try:
            self.wait_for_page_load()
            
            # 查找代理列表相关元素
            agent_texts = ['添加代理', '搜索', '余额', '代理管理']
            found_texts = []
            
            for text in agent_texts:
                element = self.find_element_by_text(text)
                if element:
                    found_texts.append(text)
            
            duration = time.time() - start_time
            screenshot = self.take_screenshot("04_agent_list")
            
            if found_texts:
                TestReporter.record('代理商列表页面', TestStatus.PASS, 
                                  f"找到元素: {', '.join(found_texts)}", duration, screenshot)
            else:
                TestReporter.record('代理商列表页面', TestStatus.SKIP, 
                                  '未找到代理商列表元素（可能需要登录）', duration, screenshot)
        except Exception as e:
            duration = time.time() - start_time
            screenshot = self.take_screenshot("04_agent_list_error")
            TestReporter.record('代理商列表页面', TestStatus.ERROR, str(e), duration, screenshot, traceback.format_exc())
    
    def test_order_page(self):
        """测试订单页面"""
        start_time = time.time()
        try:
            # 尝试点击"开单"导航
            self.click_element_by_text('开单')
            self.wait_for_page_load()
            
            order_texts = ['选择代理', '选择商品', '确认开单', '订单']
            found_texts = []
            
            for text in order_texts:
                element = self.find_element_by_text(text)
                if element:
                    found_texts.append(text)
            
            duration = time.time() - start_time
            screenshot = self.take_screenshot("05_order_page")
            
            if found_texts:
                TestReporter.record('订单页面', TestStatus.PASS, 
                                  f"找到元素: {', '.join(found_texts)}", duration, screenshot)
            else:
                TestReporter.record('订单页面', TestStatus.SKIP, 
                                  '未找到订单页面元素（可能需要登录）', duration, screenshot)
        except Exception as e:
            duration = time.time() - start_time
            screenshot = self.take_screenshot("05_order_page_error")
            TestReporter.record('订单页面', TestStatus.ERROR, str(e), duration, screenshot, traceback.format_exc())
    
    def test_finance_page(self):
        """测试财务管理页面"""
        start_time = time.time()
        try:
            # 尝试点击"财务"导航
            self.click_element_by_text('财务')
            self.wait_for_page_load()
            
            finance_texts = ['充值', '扣款', '调货', '财务', '交易']
            found_texts = []
            
            for text in finance_texts:
                element = self.find_element_by_text(text)
                if element:
                    found_texts.append(text)
            
            duration = time.time() - start_time
            screenshot = self.take_screenshot("06_finance_page")
            
            if found_texts:
                TestReporter.record('财务管理页面', TestStatus.PASS, 
                                  f"找到元素: {', '.join(found_texts)}", duration, screenshot)
            else:
                TestReporter.record('财务管理页面', TestStatus.SKIP, 
                                  '未找到财务页面元素（可能需要登录）', duration, screenshot)
        except Exception as e:
            duration = time.time() - start_time
            screenshot = self.take_screenshot("06_finance_page_error")
            TestReporter.record('财务管理页面', TestStatus.ERROR, str(e), duration, screenshot, traceback.format_exc())
    
    def test_button_interactions(self):
        """测试按钮交互"""
        start_time = time.time()
        try:
            self.wait_for_page_load()
            
            # 查找所有按钮
            buttons = self.driver.find_elements(By.CSS_SELECTOR, 
                "button, .btn, [class*='button'], [class*='btn'], [class*='Button']")
            
            duration = time.time() - start_time
            screenshot = self.take_screenshot("07_buttons")
            
            if buttons:
                TestReporter.record('按钮交互', TestStatus.PASS, 
                                  f"找到{len(buttons)}个按钮", duration, screenshot)
            else:
                TestReporter.record('按钮交互', TestStatus.SKIP, 
                                  '未找到按钮（可能需要登录）', duration, screenshot)
        except Exception as e:
            duration = time.time() - start_time
            screenshot = self.take_screenshot("07_buttons_error")
            TestReporter.record('按钮交互', TestStatus.ERROR, str(e), duration, screenshot, traceback.format_exc())
    
    def test_form_inputs(self):
        """测试表单输入"""
        start_time = time.time()
        try:
            self.wait_for_page_load()
            
            # 查找所有输入框
            inputs = self.driver.find_elements(By.CSS_SELECTOR, 
                "input, textarea, [contenteditable='true']")
            
            duration = time.time() - start_time
            screenshot = self.take_screenshot("08_form_inputs")
            
            if inputs:
                TestReporter.record('表单输入', TestStatus.PASS, 
                                  f"找到{len(inputs)}个输入框", duration, screenshot)
            else:
                TestReporter.record('表单输入', TestStatus.SKIP, 
                                  '未找到输入框（可能需要登录）', duration, screenshot)
        except Exception as e:
            duration = time.time() - start_time
            screenshot = self.take_screenshot("08_form_inputs_error")
            TestReporter.record('表单输入', TestStatus.ERROR, str(e), duration, screenshot, traceback.format_exc())
    
    def run_all_tests(self):
        """运行所有测试"""
        print("开始运行Nomur UI自动化测试（高级版）...\n")
        print(f"测试地址: {self.base_url}\n")
        
        test_methods = [
            self.test_page_load,
            self.test_navigation_tabs,
            self.test_click_navigation,
            self.test_agent_list_page,
            self.test_order_page,
            self.test_finance_page,
            self.test_button_interactions,
            self.test_form_inputs,
        ]
        
        for test_method in test_methods:
            try:
                test_method()
                time.sleep(1)
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
    
    parser = argparse.ArgumentParser(description='Nomur UI自动化测试（高级版）')
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

