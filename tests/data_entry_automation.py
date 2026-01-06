#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Nomur 微商管理系统 - 数据添加自动化脚本

功能：
1. 自动生成测试数据并批量添加（商品、代理商、促销活动、订单）
2. 检查功能性问题（页面元素、导航、表单等）
3. 移动端测试（浏览器以手机尺寸 390x844 打开）

特点：
- 交互式控制：每个步骤执行前等待用户确认
- 自动生成测试数据：无需手动输入，脚本自动生成
- 批量操作：支持批量添加多种测试数据
"""

import time
import sys
import random
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.common.keys import Keys
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.chrome.options import Options
from selenium.common.exceptions import TimeoutException, NoSuchElementException
import platform

# 配置
BASE_URL = "https://nomur.linkmate.site/"
WAIT_TIMEOUT = 10

# 测试数据生成器
class TestDataGenerator:
    """测试数据生成器"""
    
    # 商品名称列表
    PRODUCT_NAMES = [
        "芒果果汁", "茉莉茶", "龙井茶", "绿茶", "红茶",
        "乌龙茶", "普洱茶", "铁观音", "碧螺春", "毛峰",
        "柠檬汁", "橙汁", "苹果汁", "葡萄汁", "西瓜汁"
    ]
    
    # 代理商姓名列表
    AGENT_NAMES = [
        "张三", "李四", "王五", "赵六", "钱七",
        "孙八", "周九", "吴十", "郑一", "王二",
        "刘三", "陈四", "杨五", "黄六", "林七"
    ]
    
    # 城市列表
    CITIES = [
        "北京", "上海", "广州", "深圳", "杭州",
        "成都", "武汉", "西安", "南京", "重庆"
    ]
    
    # 促销活动名称
    PROMOTION_NAMES = [
        "年终大促", "春节特惠", "夏季促销", "秋季优惠", "冬季特卖",
        "新品上市", "限时抢购", "满减活动", "买赠活动", "会员专享"
    ]
    
    @staticmethod
    def generate_product():
        """生成商品测试数据"""
        name = random.choice(TestDataGenerator.PRODUCT_NAMES)
        # 避免重复，添加随机后缀
        if random.random() > 0.5:
            name += f"（{random.randint(1, 100)}号）"
        price = random.choice([50, 60, 70, 80, 90, 100, 120, 150, 200])
        weight = random.choice([1.5, 2.0, 2.5, 3.0, 3.5, 4.0])
        return {
            'name': name,
            'price': price,
            'weight': weight
        }
    
    @staticmethod
    def generate_agent():
        """生成代理商测试数据"""
        name = random.choice(TestDataGenerator.AGENT_NAMES)
        # 避免重复，添加随机后缀
        if random.random() > 0.5:
            name += random.choice(["A", "B", "C", "D", "E", "M", "X", "Y", "Z"])
        
        # 生成手机号
        phone1 = f"1{random.randint(3, 9)}{random.randint(100000000, 999999999)}"
        phone2 = None
        if random.random() > 0.6:  # 40% 概率有备用手机号
            phone2 = f"1{random.randint(3, 9)}{random.randint(100000000, 999999999)}"
        
        city = random.choice(TestDataGenerator.CITIES)
        district = random.choice(["区", "县", "市"])
        address = f"{city}市{random.choice(['朝阳', '海淀', '西城', '东城', '丰台', '石景山'])}{district}{random.randint(1, 99)}号"
        
        return {
            'name': name,
            'phone1': phone1,
            'phone2': phone2,
            'address': address
        }
    
    @staticmethod
    def generate_promotion():
        """生成促销活动测试数据"""
        name = random.choice(TestDataGenerator.PROMOTION_NAMES)
        if random.random() > 0.5:
            name += f"{random.randint(1, 10)}"
        
        descriptions = [
            "每满100件赠送5件",
            "每满200件赠送10件",
            "每满50件赠送3件",
            "买10送1",
            "买20送2",
            "满1000元减100元",
            "满2000元减200元"
        ]
        description = random.choice(descriptions)
        threshold = random.choice([50, 100, 150, 200, 300, 500])
        
        return {
            'name': name,
            'description': description,
            'threshold': threshold
        }
    
    @staticmethod
    def generate_order_items(product_count=2):
        """生成订单商品项"""
        items = []
        products = random.sample(TestDataGenerator.PRODUCT_NAMES, min(product_count, len(TestDataGenerator.PRODUCT_NAMES)))
        for product in products:
            quantity = random.choice([10, 20, 50, 100, 200, 500])
            items.append((product, quantity))
        return items

class DataEntryBot:
    def __init__(self):
        self.driver = None
        self.wait = None
        
    def wait_for_user(self, message):
        """等待用户确认"""
        print(f"\n{'='*60}")
        print(f"⏸️  {message}")
        print(f"{'='*60}")
        print("按回车键继续，或输入 'q' 退出...")
        user_input = input().strip().lower()
        if user_input == 'q':
            print("用户取消操作，退出脚本")
            self.cleanup()
            sys.exit(0)
        print("继续执行...\n")
        time.sleep(0.5)
    
    def init_driver(self):
        """初始化浏览器驱动（移动端尺寸）"""
        print("正在初始化浏览器（移动端模式）...")
        
        chrome_options = Options()
        
        # 移动端设备模拟（iPhone 12 Pro 尺寸）
        mobile_emulation = {
            "deviceMetrics": {
                "width": 390,
                "height": 844,
                "pixelRatio": 3.0
            },
            "userAgent": "Mozilla/5.0 (iPhone; CPU iPhone OS 14_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0.3 Mobile/15E148 Safari/604.1"
        }
        chrome_options.add_experimental_option("mobileEmulation", mobile_emulation)
        
        # 根据平台设置
        if platform.system() == 'Windows':
            # Windows 平台
            chrome_options.add_argument('--disable-blink-features=AutomationControlled')
            chrome_options.add_experimental_option("excludeSwitches", ["enable-automation"])
            chrome_options.add_experimental_option('useAutomationExtension', False)
        else:
            # Linux/Mac 平台（不在无头模式，以便查看）
            chrome_options.add_argument('--no-sandbox')
            chrome_options.add_argument('--disable-dev-shm-usage')
        
        chrome_options.add_argument('--disable-gpu')
        # 设置窗口大小为手机尺寸（加上浏览器边框）
        chrome_options.add_argument('--window-size=410,900')
        
        try:
            self.driver = webdriver.Chrome(options=chrome_options)
            self.wait = WebDriverWait(self.driver, WAIT_TIMEOUT)
            # 确保视口大小为移动端尺寸
            self.driver.set_window_size(410, 900)
            print("✅ 浏览器初始化成功（移动端模式：390x844）")
        except Exception as e:
            print(f"❌ 浏览器初始化失败: {e}")
            print("\n请确保已安装 Chrome 浏览器和 ChromeDriver")
            print("下载地址: https://chromedriver.chromium.org/")
            sys.exit(1)
    
    def open_url(self):
        """打开网站"""
        self.wait_for_user("准备打开网站: " + BASE_URL)
        try:
            self.driver.get(BASE_URL)
            time.sleep(2)
            print(f"✅ 已打开网站: {BASE_URL}")
            print(f"当前页面标题: {self.driver.title}")
        except Exception as e:
            print(f"❌ 打开网站失败: {e}")
            raise
    
    def login(self, phone):
        """登录系统"""
        self.wait_for_user(f"准备登录，手机号: {phone}")
        try:
            # 等待页面加载
            time.sleep(3)
            
            # 查找手机号输入框（uni-app H5 页面可能使用不同的选择器）
            selectors = [
                "input[type='tel']",
                "input[type='number']",
                "input[placeholder*='手机']",
                "input[placeholder*='电话']",
                "input[placeholder*='请输入手机号']",
                ".uni-input-input",
                "input",
            ]
            
            phone_input = None
            for selector in selectors:
                try:
                    elements = self.driver.find_elements(By.CSS_SELECTOR, selector)
                    for elem in elements:
                        if elem.is_displayed() and elem.is_enabled():
                            phone_input = elem
                            break
                    if phone_input:
                        break
                except:
                    continue
            
            if phone_input:
                phone_input.clear()
                phone_input.click()
                time.sleep(0.5)
                phone_input.send_keys(phone)
                print(f"✅ 已输入手机号: {phone}")
            else:
                print("⚠️  未找到手机号输入框，请手动输入")
                self.wait_for_user("请手动输入手机号并登录，完成后按回车")
                return
            
            # 查找登录按钮
            btn_selectors = [
                "button",
                ".btn",
                "[class*='button']",
                "[class*='login']",
                "//button[contains(text(), '登录')]",
                "//button[contains(text(), '确认')]",
            ]
            
            login_btn = None
            for selector in btn_selectors:
                try:
                    if selector.startswith("//"):
                        elements = self.driver.find_elements(By.XPATH, selector)
                    else:
                        elements = self.driver.find_elements(By.CSS_SELECTOR, selector)
                    for elem in elements:
                        if elem.is_displayed() and elem.is_enabled():
                            login_btn = elem
                            break
                    if login_btn:
                        break
                except:
                    continue
            
            if login_btn:
                login_btn.click()
                print("✅ 已点击登录按钮")
            else:
                print("⚠️  未找到登录按钮，请手动点击")
                self.wait_for_user("请手动点击登录按钮，完成后按回车")
            
            # 等待登录完成
            time.sleep(3)
            print("✅ 登录流程完成")
            
        except Exception as e:
            print(f"⚠️  登录过程出现问题: {e}")
            print("请手动完成登录")
            self.wait_for_user("请手动完成登录，完成后按回车")
    
    def navigate_to_page(self, page_name, selector_hint):
        """导航到指定页面"""
        self.wait_for_user(f"准备导航到: {page_name}")
        try:
            # 等待页面稳定
            time.sleep(2)
            
            # 尝试多种方式查找导航元素
            selectors = [
                f"//*[contains(text(), '{page_name}')]",
                f"//*[contains(text(), '{page_name}') and (contains(@class, 'nav') or contains(@class, 'tab') or contains(@class, 'menu'))]",
                f"//a[contains(text(), '{page_name}')]",
                f"//button[contains(text(), '{page_name}')]",
                f"//*[@role='button' and contains(text(), '{page_name}')]",
            ]
            
            element = None
            for selector in selectors:
                try:
                    elements = self.driver.find_elements(By.XPATH, selector)
                    for elem in elements:
                        if elem.is_displayed() and elem.is_enabled():
                            element = elem
                            break
                    if element:
                        break
                except:
                    continue
            
            if element:
                # 滚动到元素可见
                self.driver.execute_script("arguments[0].scrollIntoView(true);", element)
                time.sleep(0.5)
                element.click()
                time.sleep(2)
                print(f"✅ 已导航到: {page_name}")
            else:
                print(f"⚠️  未找到 {page_name} 导航元素")
                print(f"当前页面 URL: {self.driver.current_url}")
                print(f"当前页面标题: {self.driver.title}")
                self.wait_for_user(f"请手动点击导航栏中的 '{page_name}'，完成后按回车")
                
        except Exception as e:
            print(f"⚠️  导航失败: {e}")
            self.wait_for_user(f"请手动导航到 {page_name}，完成后按回车")
    
    def add_product(self, name, price, weight, auto_confirm=False):
        """添加商品"""
        if not auto_confirm:
            self.wait_for_user(f"准备添加商品: {name}, 价格: ¥{price}/箱, 重量: {weight}kg/箱")
        try:
            # 查找添加商品按钮
            add_btn_selectors = [
                "//button[contains(text(), '添加')]",
                "//button[contains(text(), '商品')]",
                "//*[contains(@class, 'add-btn')]",
                "//*[contains(@class, 'add')]",
            ]
            
            add_btn = None
            for selector in add_btn_selectors:
                try:
                    add_btn = self.driver.find_element(By.XPATH, selector)
                    if add_btn.is_displayed():
                        break
                except:
                    continue
            
            if add_btn:
                add_btn.click()
                time.sleep(1)
                print("✅ 已点击添加商品按钮")
            else:
                print("⚠️  未找到添加按钮，请手动点击")
                self.wait_for_user("请手动点击添加商品按钮，完成后按回车")
            
            # 填写商品信息
            time.sleep(1)
            
            # 商品名称
            name_input = self.wait.until(
                EC.presence_of_element_located((By.CSS_SELECTOR, "input[placeholder*='名称'], input[placeholder*='商品']"))
            )
            name_input.clear()
            name_input.send_keys(name)
            print(f"✅ 已输入商品名称: {name}")
            
            # 商品价格
            price_input = self.driver.find_element(By.CSS_SELECTOR, "input[type='number'], input[placeholder*='价格'], input[placeholder*='金额']")
            price_input.clear()
            price_input.send_keys(str(price))
            print(f"✅ 已输入价格: {price}")
            
            # 商品重量
            weight_input = self.driver.find_element(By.CSS_SELECTOR, "input[placeholder*='重量'], input[placeholder*='kg']")
            weight_input.clear()
            weight_input.send_keys(str(weight))
            print(f"✅ 已输入重量: {weight}")
            
            # 保存
            save_btn = self.driver.find_element(By.CSS_SELECTOR, "button[contains(text(), '保存')], button[contains(text(), '添加')], .save-btn")
            save_btn.click()
            print("✅ 已点击保存按钮")
            
            time.sleep(2)
            print("✅ 商品添加完成")
            
        except Exception as e:
            print(f"❌ 添加商品失败: {e}")
            print("请检查页面元素或手动完成操作")
            self.wait_for_user("请检查并手动完成商品添加，完成后按回车")
    
    def add_agent(self, name, phone1, phone2, address, auto_confirm=False):
        """添加代理商"""
        if not auto_confirm:
            self.wait_for_user(f"准备添加代理商: {name}, 手机: {phone1}")
        try:
            # 导航到代理商页面
            self.navigate_to_page("客户", "代理商")
            
            # 查找添加按钮
            add_btn = self.driver.find_element(By.XPATH, "//button[contains(text(), '添加')]")
            add_btn.click()
            time.sleep(1)
            print("✅ 已点击添加代理商按钮")
            
            # 填写代理商信息
            # 姓名
            name_input = self.wait.until(
                EC.presence_of_element_located((By.CSS_SELECTOR, "input[placeholder*='姓名'], input[placeholder*='名称']"))
            )
            name_input.clear()
            name_input.send_keys(name)
            print(f"✅ 已输入姓名: {name}")
            
            # 手机号1
            phone1_input = self.driver.find_element(By.CSS_SELECTOR, "input[type='tel'], input[type='number']")
            phone1_input.clear()
            phone1_input.send_keys(phone1)
            print(f"✅ 已输入手机号1: {phone1}")
            
            # 手机号2（如果提供）
            if phone2:
                phone2_inputs = self.driver.find_elements(By.CSS_SELECTOR, "input[type='tel'], input[type='number']")
                if len(phone2_inputs) > 1:
                    phone2_inputs[1].clear()
                    phone2_inputs[1].send_keys(phone2)
                    print(f"✅ 已输入手机号2: {phone2}")
            
            # 地址
            address_input = self.driver.find_element(By.CSS_SELECTOR, "textarea, input[placeholder*='地址']")
            address_input.clear()
            address_input.send_keys(address)
            print(f"✅ 已输入地址: {address}")
            
            # 保存
            save_btn = self.driver.find_element(By.CSS_SELECTOR, "button[contains(text(), '保存')], button[contains(text(), '添加')]")
            save_btn.click()
            print("✅ 已点击保存按钮")
            
            time.sleep(2)
            print("✅ 代理商添加完成")
            
        except Exception as e:
            print(f"❌ 添加代理商失败: {e}")
            self.wait_for_user("请检查并手动完成代理商添加，完成后按回车")
    
    def add_promotion(self, name, description, threshold, auto_confirm=False):
        """添加促销活动"""
        if not auto_confirm:
            self.wait_for_user(f"准备添加促销活动: {name}")
        try:
            # 导航到促销页面
            self.navigate_to_page("促销", "促销活动")
            
            # 查找添加按钮
            add_btn = self.driver.find_element(By.XPATH, "//button[contains(text(), '添加')]")
            add_btn.click()
            time.sleep(1)
            print("✅ 已点击添加促销活动按钮")
            
            # 填写促销信息
            # 活动名称
            name_input = self.wait.until(
                EC.presence_of_element_located((By.CSS_SELECTOR, "input[placeholder*='名称'], input[placeholder*='活动']"))
            )
            name_input.clear()
            name_input.send_keys(name)
            print(f"✅ 已输入活动名称: {name}")
            
            # 活动说明
            desc_input = self.driver.find_element(By.CSS_SELECTOR, "input[placeholder*='说明'], input[placeholder*='描述'], textarea")
            desc_input.clear()
            desc_input.send_keys(description)
            print(f"✅ 已输入活动说明: {description}")
            
            # 满足条件
            threshold_input = self.driver.find_element(By.CSS_SELECTOR, "input[type='number'], input[placeholder*='条件'], input[placeholder*='件']")
            threshold_input.clear()
            threshold_input.send_keys(str(threshold))
            print(f"✅ 已输入满足条件: {threshold}件")
            
            # 保存
            save_btn = self.driver.find_element(By.CSS_SELECTOR, "button[contains(text(), '保存')], button[contains(text(), '添加')]")
            save_btn.click()
            print("✅ 已点击保存按钮")
            
            time.sleep(2)
            print("✅ 促销活动添加完成")
            
        except Exception as e:
            print(f"❌ 添加促销活动失败: {e}")
            self.wait_for_user("请检查并手动完成促销活动添加，完成后按回车")
    
    def create_order(self, agent_name, items, auto_confirm=False):
        """创建订单"""
        if not auto_confirm:
            self.wait_for_user(f"准备创建订单，代理商: {agent_name}")
        try:
            # 导航到开单页面
            self.navigate_to_page("开单", "订单")
            
            # 选择代理商
            agent_select = self.wait.until(
                EC.presence_of_element_located((By.XPATH, f"//*[contains(text(), '{agent_name}')]"))
            )
            agent_select.click()
            print(f"✅ 已选择代理商: {agent_name}")
            
            # 添加商品
            for item in items:
                product_name, quantity = item
                if not auto_confirm:
                    self.wait_for_user(f"准备添加商品到订单: {product_name} x{quantity}")
                
                # 查找商品并选择
                product = self.driver.find_element(By.XPATH, f"//*[contains(text(), '{product_name}')]")
                product.click()
                time.sleep(0.5)
                
                # 输入数量
                quantity_input = self.driver.find_element(By.CSS_SELECTOR, "input[type='number']")
                quantity_input.clear()
                quantity_input.send_keys(str(quantity))
                print(f"✅ 已添加: {product_name} x{quantity}")
            
            # 提交订单
            if not auto_confirm:
                self.wait_for_user("准备提交订单")
            submit_btn = self.driver.find_element(By.CSS_SELECTOR, "button[contains(text(), '提交')], button[contains(text(), '确认')], button[contains(text(), '开单')]")
            submit_btn.click()
            print("✅ 已提交订单")
            
            time.sleep(2)
            print("✅ 订单创建完成")
            
        except Exception as e:
            print(f"❌ 创建订单失败: {e}")
            self.wait_for_user("请检查并手动完成订单创建，完成后按回车")
    
    def check_page_elements(self, page_name):
        """检查页面元素是否存在"""
        self.wait_for_user(f"准备检查 {page_name} 页面的功能元素")
        try:
            time.sleep(2)
            
            # 检查常见元素
            elements_to_check = [
                ("按钮", "button"),
                ("输入框", "input"),
                ("列表项", "[class*='list'], [class*='item'], [class*='card']"),
                ("导航", "[class*='nav'], [class*='tab']"),
            ]
            
            found_elements = {}
            for name, selector in elements_to_check:
                try:
                    elements = self.driver.find_elements(By.CSS_SELECTOR, selector)
                    visible_count = sum(1 for e in elements if e.is_displayed())
                    found_elements[name] = visible_count
                    print(f"  ✓ {name}: 找到 {visible_count} 个可见元素")
                except:
                    found_elements[name] = 0
                    print(f"  ✗ {name}: 未找到")
            
            # 检查页面标题
            page_title = self.driver.title
            print(f"\n页面标题: {page_title}")
            print(f"当前URL: {self.driver.current_url}")
            
            return found_elements
            
        except Exception as e:
            print(f"❌ 检查页面元素失败: {e}")
            return {}
    
    def verify_data_exists(self, data_type, search_text):
        """验证数据是否存在"""
        self.wait_for_user(f"准备验证 {data_type} 是否存在: {search_text}")
        try:
            time.sleep(2)
            
            # 尝试查找包含搜索文本的元素
            selectors = [
                f"//*[contains(text(), '{search_text}')]",
                f"//*[@class='name' and contains(text(), '{search_text}')]",
                f"//*[@class='title' and contains(text(), '{search_text}')]",
            ]
            
            found = False
            for selector in selectors:
                try:
                    elements = self.driver.find_elements(By.XPATH, selector)
                    for elem in elements:
                        if elem.is_displayed() and search_text in elem.text:
                            print(f"✅ 找到 {data_type}: {search_text}")
                            print(f"   元素文本: {elem.text[:50]}...")
                            found = True
                            break
                    if found:
                        break
                except:
                    continue
            
            if not found:
                print(f"⚠️  未找到 {data_type}: {search_text}")
                print("   可能原因：数据未添加成功、页面未刷新、或元素定位失败")
            
            return found
            
        except Exception as e:
            print(f"❌ 验证数据失败: {e}")
            return False
    
    def test_navigation(self):
        """测试导航功能"""
        self.wait_for_user("准备测试导航功能")
        try:
            nav_items = ["驾驶舱", "开单", "客户", "财务", "收款人"]
            results = {}
            
            for item in nav_items:
                print(f"\n测试导航到: {item}")
                try:
                    # 尝试点击导航项
                    nav_element = self.driver.find_element(By.XPATH, f"//*[contains(text(), '{item}')]")
                    if nav_element.is_displayed():
                        nav_element.click()
                        time.sleep(2)
                        print(f"  ✅ 成功导航到: {item}")
                        results[item] = True
                    else:
                        print(f"  ⚠️  导航项不可见: {item}")
                        results[item] = False
                except:
                    print(f"  ❌ 未找到导航项: {item}")
                    results[item] = False
            
            return results
            
        except Exception as e:
            print(f"❌ 测试导航失败: {e}")
            return {}
    
    def test_form_submission(self, form_type):
        """测试表单提交功能"""
        self.wait_for_user(f"准备测试 {form_type} 表单提交功能")
        try:
            # 查找表单元素
            inputs = self.driver.find_elements(By.CSS_SELECTOR, "input, textarea, select")
            buttons = self.driver.find_elements(By.CSS_SELECTOR, "button, [type='submit'], [class*='btn']")
            
            print(f"找到 {len(inputs)} 个输入框")
            print(f"找到 {len(buttons)} 个按钮")
            
            # 检查必填字段
            required_inputs = []
            for inp in inputs:
                if inp.get_attribute('required') or 'required' in inp.get_attribute('class') or '':
                    placeholder = inp.get_attribute('placeholder') or '无占位符'
                    required_inputs.append(placeholder)
            
            if required_inputs:
                print(f"\n必填字段: {', '.join(required_inputs[:5])}")
            
            return {
                'inputs': len(inputs),
                'buttons': len(buttons),
                'required_fields': len(required_inputs)
            }
            
        except Exception as e:
            print(f"❌ 测试表单失败: {e}")
            return {}
    
    def cleanup(self):
        """清理资源"""
        if self.driver:
            print("\n正在关闭浏览器...")
            self.driver.quit()
            print("✅ 浏览器已关闭")

def main():
    """主函数"""
    print("="*60)
    print("Nomur 微商管理系统 - 数据添加自动化脚本")
    print("="*60)
    print("\n此脚本将帮助您自动化添加数据到系统中")
    print("每个步骤执行前都会等待您的确认")
    print("输入 'q' 可以随时退出脚本\n")
    
    bot = DataEntryBot()
    
    try:
        # 初始化浏览器
        bot.wait_for_user("准备初始化浏览器（将打开 Chrome 浏览器）")
        bot.init_driver()
        
        # 打开网站
        bot.open_url()
        
        # 登录
        print("\n" + "="*60)
        phone = input("请输入管理员手机号（直接回车跳过登录）: ").strip()
        if phone:
            bot.login(phone)
        else:
            print("跳过登录步骤")
            bot.wait_for_user("如果已登录，请按回车继续；如果未登录，请先手动登录")
        
        # 主菜单
        while True:
            print("\n" + "="*60)
            print("📋 请选择要执行的操作:")
            print("="*60)
            print("1. 自动添加商品（使用测试数据）")
            print("2. 自动添加代理商（使用测试数据）")
            print("3. 自动添加促销活动（使用测试数据）")
            print("4. 自动创建订单（使用测试数据）")
            print("5. 批量添加测试数据（商品+代理商+促销+订单）")
            print("6. 手动操作模式（暂停脚本，等待您手动操作）")
            print("7. 查看当前页面信息")
            print("8. 检查页面功能元素")
            print("9. 验证数据是否存在")
            print("10. 测试导航功能")
            print("11. 测试表单提交功能")
            print("12. 🚀 完整功能演示（推荐：演示所有功能模块）")
            print("0. 退出")
            print("="*60)
            
            choice = input("请输入选项 (0-12): ").strip()
            
            if choice == '0':
                break
            elif choice == '1':
                # 自动添加商品
                count = input("要添加几个商品？(直接回车默认1个): ").strip()
                count = int(count) if count.isdigit() else 1
                for i in range(count):
                    data = TestDataGenerator.generate_product()
                    print(f"\n[商品 {i+1}/{count}] 自动生成数据: {data['name']}, ¥{data['price']}/箱, {data['weight']}kg/箱")
                    bot.add_product(data['name'], data['price'], data['weight'])
                    if i < count - 1:
                        time.sleep(1)  # 添加间隔
            elif choice == '2':
                # 自动添加代理商
                count = input("要添加几个代理商？(直接回车默认1个): ").strip()
                count = int(count) if count.isdigit() else 1
                for i in range(count):
                    data = TestDataGenerator.generate_agent()
                    print(f"\n[代理商 {i+1}/{count}] 自动生成数据: {data['name']}, {data['phone1']}, {data['address']}")
                    bot.add_agent(data['name'], data['phone1'], data['phone2'], data['address'])
                    if i < count - 1:
                        time.sleep(1)
            elif choice == '3':
                # 自动添加促销活动
                count = input("要添加几个促销活动？(直接回车默认1个): ").strip()
                count = int(count) if count.isdigit() else 1
                for i in range(count):
                    data = TestDataGenerator.generate_promotion()
                    print(f"\n[促销活动 {i+1}/{count}] 自动生成数据: {data['name']}, {data['description']}, {data['threshold']}件")
                    bot.add_promotion(data['name'], data['description'], data['threshold'])
                    if i < count - 1:
                        time.sleep(1)
            elif choice == '4':
                # 自动创建订单
                count = input("要创建几个订单？(直接回车默认1个): ").strip()
                count = int(count) if count.isdigit() else 1
                for i in range(count):
                    agent_data = TestDataGenerator.generate_agent()
                    items = TestDataGenerator.generate_order_items(random.randint(1, 3))
                    print(f"\n[订单 {i+1}/{count}] 自动生成数据:")
                    print(f"  代理商: {agent_data['name']}")
                    print(f"  商品: {', '.join([f'{p} x{q}' for p, q in items])}")
                    # 注意：这里假设代理商已存在，实际使用时可能需要先添加代理商
                    bot.create_order(agent_data['name'], items)
                    if i < count - 1:
                        time.sleep(1)
            elif choice == '5':
                # 批量添加测试数据
                print("\n--- 批量添加测试数据 ---")
                product_count = input("商品数量 (直接回车默认3个): ").strip()
                agent_count = input("代理商数量 (直接回车默认3个): ").strip()
                promotion_count = input("促销活动数量 (直接回车默认2个): ").strip()
                order_count = input("订单数量 (直接回车默认2个): ").strip()
                
                product_count = int(product_count) if product_count.isdigit() else 3
                agent_count = int(agent_count) if agent_count.isdigit() else 3
                promotion_count = int(promotion_count) if promotion_count.isdigit() else 2
                order_count = int(order_count) if order_count.isdigit() else 2
                
                bot.wait_for_user(f"准备批量添加：{product_count}个商品，{agent_count}个代理商，{promotion_count}个促销活动，{order_count}个订单")
                
                # 添加商品
                if product_count > 0:
                    print(f"\n📦 开始添加 {product_count} 个商品...")
                    bot.wait_for_user(f"准备批量添加 {product_count} 个商品")
                    for i in range(product_count):
                        data = TestDataGenerator.generate_product()
                        print(f"[{i+1}/{product_count}] {data['name']}, ¥{data['price']}/箱, {data['weight']}kg/箱")
                        bot.add_product(data['name'], data['price'], data['weight'], auto_confirm=True)
                        time.sleep(0.5)
                
                # 添加代理商
                if agent_count > 0:
                    print(f"\n👥 开始添加 {agent_count} 个代理商...")
                    bot.wait_for_user(f"准备批量添加 {agent_count} 个代理商")
                    for i in range(agent_count):
                        data = TestDataGenerator.generate_agent()
                        print(f"[{i+1}/{agent_count}] {data['name']}, {data['phone1']}, {data['address']}")
                        bot.add_agent(data['name'], data['phone1'], data['phone2'], data['address'], auto_confirm=True)
                        time.sleep(0.5)
                
                # 添加促销活动
                if promotion_count > 0:
                    print(f"\n🎁 开始添加 {promotion_count} 个促销活动...")
                    bot.wait_for_user(f"准备批量添加 {promotion_count} 个促销活动")
                    for i in range(promotion_count):
                        data = TestDataGenerator.generate_promotion()
                        print(f"[{i+1}/{promotion_count}] {data['name']}, {data['description']}, {data['threshold']}件")
                        bot.add_promotion(data['name'], data['description'], data['threshold'], auto_confirm=True)
                        time.sleep(0.5)
                
                # 创建订单（使用已添加的代理商）
                if order_count > 0:
                    print(f"\n📋 开始创建 {order_count} 个订单...")
                    print("注意：订单将使用已添加的代理商，如果代理商不存在，请先添加")
                    bot.wait_for_user(f"准备批量创建 {order_count} 个订单")
                    for i in range(order_count):
                        # 随机选择一个已添加的代理商名称（简化处理，实际应该从列表获取）
                        agent_name = TestDataGenerator.AGENT_NAMES[random.randint(0, len(TestDataGenerator.AGENT_NAMES)-1)]
                        items = TestDataGenerator.generate_order_items(random.randint(1, 3))
                        print(f"[{i+1}/{order_count}] 代理商: {agent_name}, 商品: {', '.join([f'{p} x{q}' for p, q in items])}")
                        bot.create_order(agent_name, items, auto_confirm=True)
                        time.sleep(0.5)
                
                print("\n✅ 批量添加完成！")
            elif choice == '6':
                # 手动操作模式
                bot.wait_for_user("手动操作模式：请在浏览器中完成操作，完成后按回车继续")
            elif choice == '7':
                # 查看当前页面信息
                print("\n--- 当前页面信息 ---")
                print(f"URL: {bot.driver.current_url}")
                print(f"标题: {bot.driver.title}")
                print(f"页面源码长度: {len(bot.driver.page_source)} 字符")
                bot.wait_for_user("查看完成，按回车继续")
            elif choice == '8':
                # 检查页面功能元素
                page_name = input("页面名称（如：商品管理、代理商管理）: ").strip() or "当前页面"
                bot.check_page_elements(page_name)
                bot.wait_for_user("检查完成，按回车继续")
            elif choice == '9':
                # 验证数据是否存在
                data_type = input("数据类型（如：商品、代理商）: ").strip() or "数据"
                search_text = input("要查找的文本: ").strip()
                if search_text:
                    bot.verify_data_exists(data_type, search_text)
                    bot.wait_for_user("验证完成，按回车继续")
                else:
                    print("⚠️  请输入要查找的文本")
            elif choice == '10':
                # 测试导航功能
                bot.test_navigation()
                bot.wait_for_user("测试完成，按回车继续")
            elif choice == '11':
                # 测试表单提交功能
                form_type = input("表单类型（如：商品、代理商）: ").strip() or "表单"
                bot.test_form_submission(form_type)
                bot.wait_for_user("测试完成，按回车继续")
            elif choice == '12':
                # 完整功能演示
                print("\n" + "="*60)
                print("🚀 启动完整功能演示")
                print("="*60)
                print("这将关闭当前浏览器，并启动完整演示脚本")
                print("完整演示脚本将演示项目的所有功能模块")
                confirm = input("\n确认启动完整演示？(y/n): ").strip().lower()
                if confirm == 'y':
                    bot.cleanup()
                    print("\n正在启动完整演示脚本...")
                    import subprocess
                    import os
                    script_path = os.path.join(os.path.dirname(__file__), 'full_demo_automation.py')
                    subprocess.run([sys.executable, script_path])
                    print("\n完整演示已完成，退出脚本")
                    break
                else:
                    print("已取消")
            else:
                print("❌ 无效的选项，请重新选择")
        
    except KeyboardInterrupt:
        print("\n\n⚠️  用户中断操作")
    except Exception as e:
        print(f"\n❌ 发生错误: {e}")
        import traceback
        traceback.print_exc()
        bot.wait_for_user("发生错误，按回车继续或退出")
    finally:
        bot.cleanup()
        print("\n✅ 脚本执行完成，感谢使用！")

if __name__ == "__main__":
    main()

