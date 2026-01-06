#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Nomur 微商管理系统 - 完整功能演示自动化脚本

功能：
1. 完整演示整个项目的所有功能模块
2. 按照业务流程顺序执行（初始化数据 -> 业务操作 -> 查看结果）
3. 演示管理端和代理端的所有核心功能
4. 移动端测试（浏览器以手机尺寸 390x844 打开）

特点：
- 交互式控制：每个步骤执行前等待用户确认
- 完整流程：从角色选择到各个功能模块的完整演示
- 自动生成测试数据：无需手动输入，脚本自动生成
- 功能展示：让用户了解项目的完整运转方式
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
        "芒果果汁", "金桂茶", "茉莉茶", "龙井茶", "绿茶", "红茶",
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
        price = random.choice([50, 60, 70, 80, 90, 100, 120, 150, 200, 299, 399, 499, 599])
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

class FullDemoBot:
    """完整功能演示机器人"""
    
    def __init__(self):
        self.driver = None
        self.wait = None
        self.created_products = []  # 记录创建的商品
        self.created_agents = []    # 记录创建的代理商
        self.created_promotions = [] # 记录创建的促销活动
        self.created_payees = []     # 记录创建的收款账户
        
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
            chrome_options.add_argument('--disable-blink-features=AutomationControlled')
            chrome_options.add_experimental_option("excludeSwitches", ["enable-automation"])
            chrome_options.add_experimental_option('useAutomationExtension', False)
        else:
            chrome_options.add_argument('--no-sandbox')
            chrome_options.add_argument('--disable-dev-shm-usage')
        
        chrome_options.add_argument('--disable-gpu')
        chrome_options.add_argument('--window-size=410,900')
        
        try:
            self.driver = webdriver.Chrome(options=chrome_options)
            self.wait = WebDriverWait(self.driver, WAIT_TIMEOUT)
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
            time.sleep(3)
            print(f"✅ 已打开网站: {BASE_URL}")
            print(f"当前页面标题: {self.driver.title}")
        except Exception as e:
            print(f"❌ 打开网站失败: {e}")
            raise
    
    def click_element_by_text(self, text, element_type="*", timeout=5):
        """通过文本内容点击元素"""
        try:
            selectors = [
                f"//{element_type}[contains(text(), '{text}')]",
                f"//{element_type}[normalize-space(text())='{text}']",
                f"//*[contains(text(), '{text}')]",
            ]
            
            for selector in selectors:
                try:
                    elements = self.driver.find_elements(By.XPATH, selector)
                    for elem in elements:
                        if elem.is_displayed() and elem.is_enabled():
                            self.driver.execute_script("arguments[0].scrollIntoView(true);", elem)
                            time.sleep(0.3)
                            elem.click()
                            return True
                except:
                    continue
            return False
        except Exception as e:
            print(f"⚠️  点击元素失败: {e}")
            return False
    
    def find_element_by_text(self, text, element_type="*"):
        """通过文本内容查找元素"""
        try:
            selectors = [
                f"//{element_type}[contains(text(), '{text}')]",
                f"//{element_type}[normalize-space(text())='{text}']",
                f"//*[contains(text(), '{text}')]",
            ]
            
            for selector in selectors:
                try:
                    elements = self.driver.find_elements(By.XPATH, selector)
                    for elem in elements:
                        if elem.is_displayed():
                            return elem
                except:
                    continue
            return None
        except:
            return None
    
    def wait_for_page_load(self, seconds=2):
        """等待页面加载"""
        time.sleep(seconds)
    
    # ==================== 角色选择相关 ====================
    
    def select_role(self, role_name):
        """选择角色（管理端/代理端）"""
        self.wait_for_user(f"准备选择角色: {role_name}")
        try:
            if self.click_element_by_text(role_name):
                print(f"✅ 已选择角色: {role_name}")
                self.wait_for_page_load(2)
                return True
            else:
                print(f"⚠️  未找到 {role_name} 按钮，请手动点击")
                self.wait_for_user(f"请手动点击 '{role_name}' 按钮，完成后按回车")
                return True
        except Exception as e:
            print(f"⚠️  选择角色失败: {e}")
            self.wait_for_user(f"请手动选择 '{role_name}'，完成后按回车")
            return True
    
    def select_agent_from_list(self, agent_name):
        """从代理列表中选择代理商"""
        self.wait_for_user(f"准备选择代理商: {agent_name}")
        try:
            if self.click_element_by_text(agent_name):
                print(f"✅ 已选择代理商: {agent_name}")
                self.wait_for_page_load(2)
                return True
            else:
                print(f"⚠️  未找到代理商 {agent_name}，请手动选择")
                self.wait_for_user(f"请手动选择代理商 '{agent_name}'，完成后按回车")
                return True
        except Exception as e:
            print(f"⚠️  选择代理商失败: {e}")
            self.wait_for_user(f"请手动选择代理商 '{agent_name}'，完成后按回车")
            return True
    
    # ==================== 导航相关 ====================
    
    def navigate_to_tab(self, tab_name):
        """导航到底部Tab"""
        self.wait_for_user(f"准备切换到Tab: {tab_name}")
        try:
            if self.click_element_by_text(tab_name):
                print(f"✅ 已切换到Tab: {tab_name}")
                self.wait_for_page_load(2)
                return True
            else:
                print(f"⚠️  未找到Tab: {tab_name}，请手动点击")
                self.wait_for_user(f"请手动点击底部Tab '{tab_name}'，完成后按回车")
                return True
        except Exception as e:
            print(f"⚠️  切换Tab失败: {e}")
            self.wait_for_user(f"请手动切换到Tab '{tab_name}'，完成后按回车")
            return True
    
    def navigate_to_page(self, page_name):
        """导航到指定页面"""
        self.wait_for_user(f"准备导航到: {page_name}")
        try:
            if self.click_element_by_text(page_name):
                print(f"✅ 已导航到: {page_name}")
                self.wait_for_page_load(2)
                return True
            else:
                print(f"⚠️  未找到 {page_name} 按钮，请手动点击")
                self.wait_for_user(f"请手动点击 '{page_name}' 按钮，完成后按回车")
                return True
        except Exception as e:
            print(f"⚠️  导航失败: {e}")
            self.wait_for_user(f"请手动导航到 {page_name}，完成后按回车")
            return True
    
    # ==================== 管理端功能 ====================
    
    def demo_dashboard(self):
        """演示数据驾驶舱"""
        print("\n" + "="*60)
        print("📊 演示功能：数据驾驶舱")
        print("="*60)
        print("功能说明：")
        print("  - 年度总发货箱数统计")
        print("  - 近30天出库统计")
        print("  - 年度发货分布（按产品）")
        print("  - 代理商列表展示")
        print("  - 代理商余额显示（支持负数）")
        self.wait_for_user("请查看数据驾驶舱页面，了解统计数据和代理商列表")
        
        # 尝试点击商品按钮
        self.navigate_to_page("商品")
        
        # 返回驾驶舱
        self.navigate_to_tab("驾驶舱")
    
    def demo_add_product(self, product_data):
        """演示添加商品"""
        print(f"\n📦 添加商品: {product_data['name']}")
        print(f"   价格: ¥{product_data['price']}/箱")
        print(f"   重量: {product_data['weight']}kg/箱")
        
        self.wait_for_user(f"准备添加商品: {product_data['name']}")
        
        # 点击添加商品按钮
        self.navigate_to_page("添加商品")
        if not self.find_element_by_text("添加商品"):
            # 尝试查找添加按钮
            self.click_element_by_text("添加")
        
        self.wait_for_page_load(1)
        
        # 填写商品信息（这里需要手动操作，因为表单元素定位复杂）
        print("⚠️  由于表单元素定位复杂，请在浏览器中手动完成以下操作：")
        print(f"   1. 上传商品图片（可选）")
        print(f"   2. 输入商品名称: {product_data['name']}")
        print(f"   3. 输入商品价格: {product_data['price']}")
        print(f"   4. 选择商品重量: {product_data['weight']}")
        print(f"   5. 上传素材库图片（可选）")
        print(f"   6. 点击保存按钮")
        
        self.wait_for_user("请手动完成商品添加，完成后按回车")
        
        # 记录创建的商品
        self.created_products.append(product_data['name'])
        print(f"✅ 商品 {product_data['name']} 已记录")
    
    def demo_add_payee(self, payee_name):
        """演示添加收款账户"""
        print(f"\n💳 添加收款账户: {payee_name}")
        
        self.wait_for_user(f"准备添加收款账户: {payee_name}")
        
        # 导航到财务管理
        self.navigate_to_tab("财务")
        
        # 点击收款账户按钮
        self.navigate_to_page("收款账户")
        if not self.find_element_by_text("收款账户"):
            self.navigate_to_page("收款人")
        
        self.wait_for_page_load(1)
        
        # 点击添加收款账户按钮
        self.navigate_to_page("添加收款账户")
        
        print("⚠️  请在浏览器中手动完成以下操作：")
        print(f"   1. 输入账户名称: {payee_name}")
        print(f"   2. 输入账号（可选）")
        print(f"   3. 输入开户银行（可选）")
        print(f"   4. 上传收款二维码（可选）")
        print(f"   5. 点击确认添加")
        
        self.wait_for_user("请手动完成收款账户添加，完成后按回车")
        
        # 记录创建的收款账户
        self.created_payees.append(payee_name)
        print(f"✅ 收款账户 {payee_name} 已记录")
    
    def demo_add_agent(self, agent_data):
        """演示添加代理商"""
        print(f"\n👥 添加代理商: {agent_data['name']}")
        print(f"   手机号: {agent_data['phone1']}")
        print(f"   地址: {agent_data['address']}")
        
        self.wait_for_user(f"准备添加代理商: {agent_data['name']}")
        
        # 导航到代理管理
        self.navigate_to_tab("客户")
        
        # 点击添加代理按钮
        self.navigate_to_page("添加代理")
        if not self.find_element_by_text("添加代理"):
            self.click_element_by_text("添加")
        
        self.wait_for_page_load(1)
        
        print("⚠️  请在浏览器中手动完成以下操作：")
        print(f"   1. 上传头像（可选）")
        print(f"   2. 输入姓名: {agent_data['name']}")
        print(f"   3. 输入主手机号: {agent_data['phone1']}")
        if agent_data.get('phone2'):
            print(f"   4. 输入备用手机号: {agent_data['phone2']}")
        print(f"   5. 输入地址: {agent_data['address']}")
        print(f"   6. 设置A产品年度目标（可选）")
        print(f"   7. 设置混合产品年度目标（可选）")
        print(f"   8. 点击保存按钮")
        
        self.wait_for_user("请手动完成代理商添加，完成后按回车")
        
        # 记录创建的代理商
        self.created_agents.append(agent_data['name'])
        print(f"✅ 代理商 {agent_data['name']} 已记录")
    
    def demo_add_promotion(self, promotion_data):
        """演示添加促销活动"""
        print(f"\n🎁 添加促销活动: {promotion_data['name']}")
        print(f"   说明: {promotion_data['description']}")
        print(f"   满足条件: {promotion_data['threshold']}件")
        
        self.wait_for_user(f"准备添加促销活动: {promotion_data['name']}")
        
        # 导航到促销管理（从驾驶舱的商品按钮旁边）
        self.navigate_to_tab("驾驶舱")
        self.navigate_to_page("促销")
        
        # 点击添加促销按钮
        self.navigate_to_page("添加促销")
        if not self.find_element_by_text("添加促销"):
            self.click_element_by_text("添加")
        
        self.wait_for_page_load(1)
        
        print("⚠️  请在浏览器中手动完成以下操作：")
        print(f"   1. 输入活动名称: {promotion_data['name']}")
        print(f"   2. 输入活动说明: {promotion_data['description']}")
        print(f"   3. 输入满足条件: {promotion_data['threshold']}件")
        print(f"   4. 选择赠品商品（可选）")
        print(f"   5. 设置开始日期和结束日期")
        print(f"   6. 点击保存按钮")
        
        self.wait_for_user("请手动完成促销活动添加，完成后按回车")
        
        # 记录创建的促销活动
        self.created_promotions.append(promotion_data['name'])
        print(f"✅ 促销活动 {promotion_data['name']} 已记录")
    
    def demo_create_order(self, agent_name, products):
        """演示创建订单"""
        print(f"\n📋 创建订单")
        print(f"   代理商: {agent_name}")
        print(f"   商品: {', '.join([f'{p} x{q}' for p, q in products])}")
        
        self.wait_for_user(f"准备创建订单，代理商: {agent_name}")
        
        # 导航到开单页面
        self.navigate_to_tab("开单")
        
        self.wait_for_page_load(2)
        
        print("⚠️  请在浏览器中手动完成以下操作：")
        print(f"   1. 选择代理商: {agent_name}")
        print(f"   2. 选择商品并设置数量:")
        for product_name, quantity in products:
            print(f"      - {product_name}: {quantity}箱")
        print(f"   3. 查看实时计算的总重量、总金额")
        print(f"   4. 查看整车计算进度（如果启用）")
        print(f"   5. 输入司机手机号")
        print(f"   6. 选择促销活动（可选）")
        print(f"   7. 上传订单图片（可选）")
        print(f"   8. 查看代理余额提示")
        print(f"   9. 点击确认开单")
        
        self.wait_for_user("请手动完成订单创建，完成后按回车")
        print("✅ 订单创建流程已演示")
    
    def demo_finance_recharge(self, agent_name, amount, payee_name):
        """演示充值功能"""
        print(f"\n💰 充值操作")
        print(f"   代理商: {agent_name}")
        print(f"   金额: ¥{amount}")
        print(f"   收款账户: {payee_name}")
        
        self.wait_for_user(f"准备为 {agent_name} 充值 ¥{amount}")
        
        # 导航到财务管理
        self.navigate_to_tab("财务")
        
        self.wait_for_page_load(1)
        
        # 点击充值按钮
        self.navigate_to_page("充值")
        
        self.wait_for_page_load(1)
        
        print("⚠️  请在浏览器中手动完成以下操作：")
        print(f"   1. 选择代理商: {agent_name}")
        print(f"   2. 选择充值原因: 代理打款")
        print(f"   3. 选择收款账户: {payee_name}")
        print(f"   4. 输入充值金额: {amount}")
        print(f"   5. 上传凭证图片（可选）")
        print(f"   6. 输入备注（可选）")
        print(f"   7. 点击确认充值")
        print(f"   ⚠️  注意：系统会检查图片是否重复使用")
        
        self.wait_for_user("请手动完成充值操作，完成后按回车")
        print("✅ 充值流程已演示")
    
    def demo_finance_deduct(self, agent_name, amount):
        """演示扣款功能"""
        print(f"\n💸 扣款操作")
        print(f"   代理商: {agent_name}")
        print(f"   金额: ¥{amount}")
        
        self.wait_for_user(f"准备为 {agent_name} 扣款 ¥{amount}")
        
        # 导航到财务管理
        self.navigate_to_tab("财务")
        
        # 点击扣款按钮
        self.navigate_to_page("扣款")
        
        self.wait_for_page_load(1)
        
        print("⚠️  请在浏览器中手动完成以下操作：")
        print(f"   1. 选择代理商: {agent_name}")
        print(f"   2. 选择扣款原因: 发货扣款 或 其他")
        print(f"   3. 输入扣款金额: {amount}")
        print(f"   4. 输入备注（可选）")
        print(f"   5. 点击确认扣款")
        
        self.wait_for_user("请手动完成扣款操作，完成后按回车")
        print("✅ 扣款流程已演示")
    
    def demo_finance_transfer(self, from_agent, to_agent, products):
        """演示调货功能"""
        print(f"\n🔄 调货操作")
        print(f"   发货方（收款方）: {from_agent}")
        print(f"   收货方（付款方）: {to_agent}")
        print(f"   商品: {', '.join([f'{p} x{q}' for p, q in products])}")
        
        self.wait_for_user(f"准备调货：从 {from_agent} 调给 {to_agent}")
        
        # 导航到财务管理
        self.navigate_to_tab("财务")
        
        # 点击调货按钮
        self.navigate_to_page("调货")
        
        self.wait_for_page_load(1)
        
        print("⚠️  请在浏览器中手动完成以下操作：")
        print(f"   1. 选择发货方（收款方）: {from_agent}")
        print(f"   2. 选择收货方（付款方）: {to_agent}")
        print(f"   3. 选择商品并设置数量:")
        for product_name, quantity in products:
            print(f"      - {product_name}: {quantity}箱")
        print(f"   4. 查看实时计算的调货总额")
        print(f"   5. 设置优惠金额（可选）")
        print(f"   6. 点击确认调货")
        print(f"   ⚠️  注意：调货是原子操作，会同时完成退款和扣款")
        
        self.wait_for_user("请手动完成调货操作，完成后按回车")
        print("✅ 调货流程已演示")
    
    def demo_view_orders(self):
        """演示查看订单列表"""
        print("\n📋 查看订单列表")
        
        self.wait_for_user("准备查看订单列表")
        
        # 导航到开单页面，然后查看订单列表
        self.navigate_to_tab("开单")
        
        # 尝试查找订单列表入口
        self.navigate_to_page("订单列表")
        if not self.find_element_by_text("订单列表"):
            print("⚠️  请在页面中查找订单列表入口")
        
        self.wait_for_user("请查看订单列表，了解订单状态和详情")
        print("✅ 订单列表查看已演示")
    
    def demo_view_agent_detail(self, agent_name):
        """演示查看代理商详情"""
        print(f"\n👤 查看代理商详情: {agent_name}")
        
        self.wait_for_user(f"准备查看代理商 {agent_name} 的详情")
        
        # 导航到代理管理
        self.navigate_to_tab("客户")
        
        # 点击代理商
        if self.click_element_by_text(agent_name):
            print(f"✅ 已点击代理商: {agent_name}")
        else:
            print(f"⚠️  请手动点击代理商 {agent_name}")
            self.wait_for_user(f"请手动点击代理商 {agent_name}，完成后按回车")
        
        self.wait_for_page_load(2)
        
        print("⚠️  请查看以下信息：")
        print(f"   1. 代理商基本信息（头像、姓名、手机号、地址）")
        print(f"   2. 余额卡片（支持负数显示）")
        print(f"   3. 年度目标完成率（A产品、混合产品）")
        print(f"   4. 快捷操作按钮（充值、扣款、调货、查看订单）")
        print(f"   5. 补充销售数据功能")
        print(f"   6. 最近交易记录列表")
        
        self.wait_for_user("请查看代理商详情页面，完成后按回车")
        print("✅ 代理商详情查看已演示")
    
    # ==================== 代理端功能 ====================
    
    def demo_agent_home(self):
        """演示代理端首页（业绩看板）"""
        print("\n📊 代理端首页 - 业绩看板")
        
        self.wait_for_user("准备查看代理端首页")
        
        self.wait_for_page_load(2)
        
        print("⚠️  请查看以下信息：")
        print("   1. 个人信息（头像、姓名、手机号）")
        print("   2. 余额卡片（支持负数显示）")
        print("   3. 年度任务进度（A产品、混合产品）")
        print("   4. 促销活动进度")
        print("   5. 快捷入口（余额明细、促销查询、我的订单、素材下载）")
        print("   6. 最近订单列表")
        
        self.wait_for_user("请查看代理端首页，了解业绩看板功能，完成后按回车")
        print("✅ 代理端首页已演示")
    
    def demo_agent_balance(self):
        """演示代理端余额明细"""
        print("\n💵 代理端余额明细")
        
        self.wait_for_user("准备查看余额明细")
        
        # 尝试点击余额明细入口
        self.navigate_to_page("余额明细")
        if not self.find_element_by_text("余额明细"):
            # 从首页点击余额卡片
            print("⚠️  请从首页点击余额卡片进入余额明细")
        
        self.wait_for_page_load(2)
        
        print("⚠️  请查看以下信息：")
        print("   1. 余额卡片显示")
        print("   2. 筛选功能（全部/收入/支出）")
        print("   3. 交易记录列表（交易类型、原因、时间、金额）")
        print("   4. 交易金额颜色（正数绿色，负数红色）")
        
        self.wait_for_user("请查看余额明细页面，完成后按回车")
        print("✅ 余额明细已演示")
    
    def demo_agent_promotions(self):
        """演示代理端促销查询"""
        print("\n🎁 代理端促销查询")
        
        self.wait_for_user("准备查看促销查询")
        
        # 尝试点击促销查询入口
        self.navigate_to_page("促销查询")
        if not self.find_element_by_text("促销查询"):
            print("⚠️  请从首页点击促销查询入口")
        
        self.wait_for_page_load(2)
        
        print("⚠️  请查看以下信息：")
        print("   1. 进行中的促销活动")
        print("   2. 我的进度（已购买数量、已获赠品数量）")
        print("   3. 距下次赠品还差多少件")
        print("   4. 进度条可视化")
        print("   5. 历史促销活动列表")
        
        self.wait_for_user("请查看促销查询页面，完成后按回车")
        print("✅ 促销查询已演示")
    
    def demo_agent_orders(self):
        """演示代理端我的订单"""
        print("\n📋 代理端我的订单")
        
        self.wait_for_user("准备查看我的订单")
        
        # 尝试点击我的订单入口
        self.navigate_to_page("我的订单")
        if not self.find_element_by_text("我的订单"):
            print("⚠️  请从首页点击我的订单入口")
        
        self.wait_for_page_load(2)
        
        print("⚠️  请查看以下信息：")
        print("   1. 订单筛选（全部/待发货/已发货/已完成）")
        print("   2. 订单列表（订单号、状态、商品明细、金额）")
        print("   3. 订单详情查看")
        print("   4. 分享订单功能")
        
        self.wait_for_user("请查看我的订单页面，完成后按回车")
        print("✅ 我的订单已演示")
    
    def demo_agent_materials(self):
        """演示代理端素材下载"""
        print("\n🖼️  代理端素材下载")
        
        self.wait_for_user("准备查看素材下载")
        
        # 尝试点击素材下载入口
        self.navigate_to_page("素材下载")
        if not self.find_element_by_text("素材下载"):
            print("⚠️  请从首页点击素材下载入口")
        
        self.wait_for_page_load(2)
        
        print("⚠️  请查看以下信息：")
        print("   1. 产品标签切换")
        print("   2. 素材数量统计")
        print("   3. 素材网格展示（3列）")
        print("   4. 图片预览功能")
        print("   5. 保存图片功能")
        print("   6. 保存全部素材按钮")
        print("   7. 网盘链接（高清大图/视频）")
        
        self.wait_for_user("请查看素材下载页面，完成后按回车")
        print("✅ 素材下载已演示")
    
    def demo_agent_profile(self):
        """演示代理端个人中心"""
        print("\n👤 代理端个人中心")
        
        self.wait_for_user("准备查看个人中心")
        
        # 尝试点击个人中心入口
        self.navigate_to_page("个人中心")
        if not self.find_element_by_text("个人中心"):
            print("⚠️  请从首页点击个人中心入口")
        
        self.wait_for_page_load(2)
        
        print("⚠️  请查看以下信息：")
        print("   1. 个人信息（头像、姓名、手机号）")
        print("   2. 余额卡片")
        print("   3. 功能菜单（我的订单、余额明细、促销活动、素材下载）")
        print("   4. 收货地址")
        print("   5. 年度目标")
        print("   6. 切换账号按钮")
        
        self.wait_for_user("请查看个人中心页面，完成后按回车")
        print("✅ 个人中心已演示")
    
    # ==================== 完整流程演示 ====================
    
    def run_full_demo(self):
        """运行完整功能演示"""
        print("\n" + "="*60)
        print("🚀 Nomur 微商管理系统 - 完整功能演示")
        print("="*60)
        print("\n本脚本将完整演示项目的所有功能模块")
        print("按照业务流程顺序执行：")
        print("  1. 系统初始化（添加基础数据）")
        print("  2. 管理端功能演示")
        print("  3. 代理端功能演示")
        print("\n每个步骤都会等待您的确认，您可以：")
        print("  - 按回车继续下一步")
        print("  - 输入 'q' 退出脚本")
        print("  - 在浏览器中手动操作完成表单填写")
        
        self.wait_for_user("准备开始完整功能演示")
        
        # ========== 第一部分：系统初始化 ==========
        print("\n" + "="*60)
        print("📋 第一部分：系统初始化 - 搭建业务基础")
        print("="*60)
        
        # 1. 打开网站
        self.open_url()
        
        # 2. 选择管理端
        print("\n--- 步骤 1: 选择管理端 ---")
        self.select_role("管理端")
        
        # 3. 查看数据驾驶舱
        print("\n--- 步骤 2: 查看数据驾驶舱 ---")
        self.demo_dashboard()
        
        # 4. 添加商品（2个）
        print("\n--- 步骤 3: 添加商品 ---")
        for i in range(2):
            product_data = TestDataGenerator.generate_product()
            self.demo_add_product(product_data)
            if i < 1:
                # 返回商品列表
                print("返回商品列表...")
                time.sleep(1)
        
        # 5. 添加收款账户（1个）
        print("\n--- 步骤 4: 添加收款账户 ---")
        payee_data = {
            'name': '公司对公账户',
            'account_no': '6222021234567890123',
            'bank_name': '中国工商银行'
        }
        self.demo_add_payee(payee_data['name'])
        
        # 6. 添加代理商（2个）
        print("\n--- 步骤 5: 添加代理商 ---")
        for i in range(2):
            agent_data = TestDataGenerator.generate_agent()
            self.demo_add_agent(agent_data)
            if i < 1:
                # 返回代理列表
                print("返回代理列表...")
                time.sleep(1)
        
        # 7. 添加促销活动（1个）
        print("\n--- 步骤 6: 添加促销活动 ---")
        promotion_data = TestDataGenerator.generate_promotion()
        self.demo_add_promotion(promotion_data)
        
        # ========== 第二部分：管理端业务操作 ==========
        print("\n" + "="*60)
        print("💼 第二部分：管理端业务操作演示")
        print("="*60)
        
        # 8. 为代理商充值
        if self.created_agents:
            print("\n--- 步骤 7: 财务管理 - 充值 ---")
            agent_name = self.created_agents[0]
            payee_name = payee_data['name'] if self.created_payees else "公司对公账户"
            self.demo_finance_recharge(agent_name, 50000, payee_name)
        
        # 9. 创建订单
        if self.created_agents and self.created_products:
            print("\n--- 步骤 8: 极速开单 - 创建订单 ---")
            agent_name = self.created_agents[0]
            products = [
                (self.created_products[0], 100),
                (self.created_products[1] if len(self.created_products) > 1 else self.created_products[0], 50)
            ]
            self.demo_create_order(agent_name, products)
        
        # 10. 查看订单列表
        print("\n--- 步骤 9: 查看订单列表 ---")
        self.demo_view_orders()
        
        # 11. 查看代理商详情
        if self.created_agents:
            print("\n--- 步骤 10: 查看代理商详情 ---")
            self.demo_view_agent_detail(self.created_agents[0])
        
        # 12. 演示扣款
        if self.created_agents:
            print("\n--- 步骤 11: 财务管理 - 扣款 ---")
            self.demo_finance_deduct(self.created_agents[0], 1000)
        
        # 13. 演示调货（如果有2个代理商）
        if len(self.created_agents) >= 2:
            print("\n--- 步骤 12: 财务管理 - 调货 ---")
            products = [(self.created_products[0], 10)]
            self.demo_finance_transfer(self.created_agents[0], self.created_agents[1], products)
        
        # ========== 第三部分：代理端功能演示 ==========
        print("\n" + "="*60)
        print("👤 第三部分：代理端功能演示")
        print("="*60)
        
        # 14. 切换账号，选择代理端
        print("\n--- 步骤 13: 切换到代理端 ---")
        self.wait_for_user("准备切换到代理端")
        
        # 尝试点击切换账号
        self.navigate_to_page("切换账号")
        if not self.find_element_by_text("切换账号"):
            print("⚠️  请手动点击切换账号按钮")
            self.wait_for_user("请手动点击切换账号，返回角色选择页面，完成后按回车")
        
        self.wait_for_page_load(2)
        
        # 选择代理端
        self.select_role("代理端")
        
        # 15. 选择代理商
        if self.created_agents:
            print("\n--- 步骤 14: 选择代理商 ---")
            self.select_agent_from_list(self.created_agents[0])
        
        # 16. 查看代理端首页
        print("\n--- 步骤 15: 代理端首页（业绩看板） ---")
        self.demo_agent_home()
        
        # 17. 查看余额明细
        print("\n--- 步骤 16: 余额明细 ---")
        self.demo_agent_balance()
        
        # 18. 查看促销查询
        print("\n--- 步骤 17: 促销查询 ---")
        self.demo_agent_promotions()
        
        # 19. 查看我的订单
        print("\n--- 步骤 18: 我的订单 ---")
        self.demo_agent_orders()
        
        # 20. 查看素材下载
        print("\n--- 步骤 19: 素材下载 ---")
        self.demo_agent_materials()
        
        # 21. 查看个人中心
        print("\n--- 步骤 20: 个人中心 ---")
        self.demo_agent_profile()
        
        # ========== 演示完成 ==========
        print("\n" + "="*60)
        print("✅ 完整功能演示已完成！")
        print("="*60)
        print("\n已演示的功能模块：")
        print("  📊 管理端：")
        print("     - 数据驾驶舱")
        print("     - 商品管理（添加商品）")
        print("     - 收款账户管理（添加收款账户）")
        print("     - 代理管理（添加代理商、查看详情）")
        print("     - 促销管理（添加促销活动）")
        print("     - 极速开单（创建订单）")
        print("     - 财务管理（充值、扣款、调货）")
        print("     - 订单列表查看")
        print("  👤 代理端：")
        print("     - 业绩看板（首页）")
        print("     - 余额明细")
        print("     - 促销查询")
        print("     - 我的订单")
        print("     - 素材下载")
        print("     - 个人中心")
        print("\n感谢使用 Nomur 微商管理系统！")
    
    def cleanup(self):
        """清理资源"""
        if self.driver:
            print("\n正在关闭浏览器...")
            self.driver.quit()
            print("✅ 浏览器已关闭")

def main():
    """主函数"""
    print("="*60)
    print("Nomur 微商管理系统 - 完整功能演示自动化脚本")
    print("="*60)
    print("\n此脚本将完整演示项目的所有功能模块")
    print("让您了解整个项目的运转方式和功能特性")
    print("\n每个步骤执行前都会等待您的确认")
    print("输入 'q' 可以随时退出脚本\n")
    
    bot = FullDemoBot()
    
    try:
        # 初始化浏览器
        bot.wait_for_user("准备初始化浏览器（将打开 Chrome 浏览器）")
        bot.init_driver()
        
        # 运行完整演示
        bot.run_full_demo()
        
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

