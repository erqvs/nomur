#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Nomur API 自动化测试脚本
覆盖所有功能点的API测试
"""

import requests
import json
import uuid
import time
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any
import traceback
from dataclasses import dataclass, field
from enum import Enum


# 测试配置
BASE_URL = "http://127.0.0.1:3001/api"
TEST_RESULTS = []
TEST_ISSUES = []


class TestStatus(Enum):
    PASS = "PASS"
    FAIL = "FAIL"
    ERROR = "ERROR"


@dataclass
class TestResult:
    test_name: str
    status: TestStatus
    message: str
    duration: float
    details: Dict[str, Any] = field(default_factory=dict)
    error: Optional[str] = None


class TestReporter:
    """测试结果记录器"""
    
    @staticmethod
    def record(test_name: str, status: TestStatus, message: str = "", 
               duration: float = 0, details: Dict = None, error: str = None):
        result = TestResult(
            test_name=test_name,
            status=status,
            message=message,
            duration=duration,
            details=details or {},
            error=error
        )
        TEST_RESULTS.append(result)
        if status != TestStatus.PASS:
            TEST_ISSUES.append(result)
        
        status_icon = "✓" if status == TestStatus.PASS else "✗"
        print(f"{status_icon} [{status.value}] {test_name}: {message}")
        if error:
            print(f"   错误: {error}")
    
    @staticmethod
    def generate_report():
        """生成测试报告"""
        total = len(TEST_RESULTS)
        passed = len([r for r in TEST_RESULTS if r.status == TestStatus.PASS])
        failed = len([r for r in TEST_RESULTS if r.status == TestStatus.FAIL])
        errors = len([r for r in TEST_RESULTS if r.status == TestStatus.ERROR])
        
        report = f"""
{'='*80}
测试报告
{'='*80}
测试时间: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}
总测试数: {total}
通过: {passed} ({passed/total*100:.1f}%)
失败: {failed} ({failed/total*100:.1f}%)
错误: {errors} ({errors/total*100:.1f}%)
{'='*80}

详细结果:
"""
        
        for result in TEST_RESULTS:
            report += f"\n[{result.status.value}] {result.test_name}\n"
            report += f"  消息: {result.message}\n"
            report += f"  耗时: {result.duration:.3f}秒\n"
            if result.details:
                report += f"  详情: {json.dumps(result.details, ensure_ascii=False, indent=2)}\n"
            if result.error:
                report += f"  错误: {result.error}\n"
        
        if TEST_ISSUES:
            report += f"\n{'='*80}\n发现的问题:\n{'='*80}\n"
            for issue in TEST_ISSUES:
                report += f"\n[{issue.status.value}] {issue.test_name}\n"
                report += f"  消息: {issue.message}\n"
                if issue.error:
                    report += f"  错误: {issue.error}\n"
        
        report += f"\n{'='*80}\n"
        
        # 保存到文件
        report_file = f"test_report_{datetime.now().strftime('%Y%m%d_%H%M%S')}.txt"
        with open(report_file, 'w', encoding='utf-8') as f:
            f.write(report)
        
        print(report)
        print(f"\n报告已保存到: {report_file}")
        
        return report


class APIClient:
    """API客户端封装"""
    
    def __init__(self, base_url: str = BASE_URL):
        self.base_url = base_url
        self.session = requests.Session()
        self.session.headers.update({'Content-Type': 'application/json'})
    
    def request(self, method: str, endpoint: str, data: Dict = None, 
                params: Dict = None) -> Dict:
        """发送请求"""
        url = f"{self.base_url}{endpoint}"
        try:
            if method.upper() == 'GET':
                response = self.session.get(url, params=params, timeout=10)
            elif method.upper() == 'POST':
                response = self.session.post(url, json=data, timeout=10)
            elif method.upper() == 'PUT':
                response = self.session.put(url, json=data, timeout=10)
            elif method.upper() == 'DELETE':
                response = self.session.delete(url, timeout=10)
            else:
                raise ValueError(f"不支持的HTTP方法: {method}")
            
            response.raise_for_status()
            return response.json()
        except requests.exceptions.RequestException as e:
            raise Exception(f"请求失败: {str(e)}")
    
    def get(self, endpoint: str, params: Dict = None) -> Dict:
        return self.request('GET', endpoint, params=params)
    
    def post(self, endpoint: str, data: Dict = None) -> Dict:
        return self.request('POST', endpoint, data=data)
    
    def put(self, endpoint: str, data: Dict = None) -> Dict:
        return self.request('PUT', endpoint, data=data)
    
    def delete(self, endpoint: str) -> Dict:
        return self.request('DELETE', endpoint)


class NomurTester:
    """Nomur API测试器"""
    
    def __init__(self):
        self.client = APIClient()
        self.test_data = {
            'product_ids': [],
            'agent_ids': [],
            'order_ids': [],
            'transaction_ids': [],
            'promotion_ids': [],
            'payment_account_ids': [],
            'admin_phone': '13800000001',  # 测试用的管理员手机号
            'agent_phone': '13800000002',  # 测试用的代理手机号
        }
    
    def run_all_tests(self):
        """运行所有测试"""
        print("开始运行Nomur API自动化测试...\n")
        
        test_methods = [
            # 基础功能
            self.test_health_check,
            
            # 认证
            self.test_auth_verify_admin,
            self.test_auth_verify_agent,
            
            # 商品管理
            self.test_products_create,
            self.test_products_list,
            self.test_products_get,
            self.test_products_update,
            
            # 代理商管理
            self.test_agents_create,
            self.test_agents_list,
            self.test_agents_get,
            self.test_agents_update,
            self.test_agents_statistics,
            
            # 交易流水
            self.test_transactions_recharge,
            self.test_transactions_deduct,
            self.test_transactions_transfer,
            self.test_transactions_list,
            
            # 订单管理
            self.test_orders_create,
            self.test_orders_list,
            self.test_orders_get,
            self.test_orders_update_status,
            
            # 促销活动
            self.test_promotions_create,
            self.test_promotions_list,
            
            # 收款账户
            self.test_payment_accounts_create,
            self.test_payment_accounts_list,
            self.test_payment_accounts_transactions,
            
            # 统计数据
            self.test_statistics,
            
            # 司机管理
            self.test_drivers_create,
            self.test_drivers_list,
            
            # 车型管理
            self.test_truck_types_create,
            self.test_truck_types_list,
            self.test_truck_types_update,
            
            # 清理测试数据
            self.cleanup_test_data,
        ]
        
        for test_method in test_methods:
            try:
                test_method()
            except Exception as e:
                TestReporter.record(
                    test_method.__name__,
                    TestStatus.ERROR,
                    f"测试执行异常: {str(e)}",
                    error=traceback.format_exc()
                )
    
    # ==================== 基础功能测试 ====================
    
    def test_health_check(self):
        """测试健康检查"""
        start_time = time.time()
        try:
            response = self.client.get('/health')
            duration = time.time() - start_time
            
            if response.get('code') == 0 and response.get('data', {}).get('database') == 'connected':
                TestReporter.record('健康检查', TestStatus.PASS, '数据库连接正常', duration)
            else:
                TestReporter.record('健康检查', TestStatus.FAIL, '数据库连接异常', duration, 
                                  details=response)
        except Exception as e:
            duration = time.time() - start_time
            TestReporter.record('健康检查', TestStatus.ERROR, str(e), duration, error=traceback.format_exc())
    
    # ==================== 认证测试 ====================
    
    def test_auth_verify_admin(self):
        """测试管理员认证"""
        start_time = time.time()
        try:
            response = self.client.post('/auth/verify', {
                'phone': self.test_data['admin_phone'],
                'role': 'admin'
            })
            duration = time.time() - start_time
            
            data = response.get('data', {})
            if response.get('code') == 0 and data.get('authorized'):
                TestReporter.record('管理员认证', TestStatus.PASS, f"认证成功: {data.get('userName')}", 
                                  duration, details=data)
            else:
                TestReporter.record('管理员认证', TestStatus.FAIL, '认证失败', duration, details=response)
        except Exception as e:
            duration = time.time() - start_time
            TestReporter.record('管理员认证', TestStatus.ERROR, str(e), duration, error=traceback.format_exc())
    
    def test_auth_verify_agent(self):
        """测试代理认证"""
        start_time = time.time()
        try:
            response = self.client.post('/auth/verify', {
                'phone': self.test_data['agent_phone'],
                'role': 'agent'
            })
            duration = time.time() - start_time
            
            data = response.get('data', {})
            if response.get('code') == 0:
                TestReporter.record('代理认证', TestStatus.PASS, 
                                  f"认证结果: {data.get('authorized', False)}", duration, details=data)
            else:
                TestReporter.record('代理认证', TestStatus.FAIL, '认证请求失败', duration, details=response)
        except Exception as e:
            duration = time.time() - start_time
            TestReporter.record('代理认证', TestStatus.ERROR, str(e), duration, error=traceback.format_exc())
    
    # ==================== 商品管理测试 ====================
    
    def test_products_create(self):
        """测试创建商品"""
        start_time = time.time()
        try:
            product_data = {
                'name': f'测试商品_{uuid.uuid4().hex[:8]}',
                'image': 'https://example.com/product.jpg',
                'price': 299.00,
                'weight': 5.5,
                'materials': []
            }
            response = self.client.post('/products', product_data)
            duration = time.time() - start_time
            
            if response.get('code') == 0 and response.get('data', {}).get('id'):
                product_id = response['data']['id']
                self.test_data['product_ids'].append(product_id)
                TestReporter.record('创建商品', TestStatus.PASS, f"商品ID: {product_id}", 
                                  duration, details={'product_id': product_id})
            else:
                TestReporter.record('创建商品', TestStatus.FAIL, '创建失败', duration, details=response)
        except Exception as e:
            duration = time.time() - start_time
            TestReporter.record('创建商品', TestStatus.ERROR, str(e), duration, error=traceback.format_exc())
    
    def test_products_list(self):
        """测试商品列表"""
        start_time = time.time()
        try:
            response = self.client.get('/products')
            duration = time.time() - start_time
            
            if response.get('code') == 0 and isinstance(response.get('data'), list):
                count = len(response['data'])
                TestReporter.record('商品列表', TestStatus.PASS, f"共{count}个商品", 
                                  duration, details={'count': count})
            else:
                TestReporter.record('商品列表', TestStatus.FAIL, '获取失败', duration, details=response)
        except Exception as e:
            duration = time.time() - start_time
            TestReporter.record('商品列表', TestStatus.ERROR, str(e), duration, error=traceback.format_exc())
    
    def test_products_get(self):
        """测试获取单个商品"""
        if not self.test_data['product_ids']:
            TestReporter.record('获取商品', TestStatus.FAIL, '没有可用的商品ID', 0)
            return
        
        start_time = time.time()
        try:
            product_id = self.test_data['product_ids'][0]
            response = self.client.get(f'/products/{product_id}')
            duration = time.time() - start_time
            
            if response.get('code') == 0 and response.get('data', {}).get('id') == product_id:
                TestReporter.record('获取商品', TestStatus.PASS, f"商品ID: {product_id}", duration)
            else:
                TestReporter.record('获取商品', TestStatus.FAIL, '获取失败', duration, details=response)
        except Exception as e:
            duration = time.time() - start_time
            TestReporter.record('获取商品', TestStatus.ERROR, str(e), duration, error=traceback.format_exc())
    
    def test_products_update(self):
        """测试更新商品"""
        if not self.test_data['product_ids']:
            TestReporter.record('更新商品', TestStatus.FAIL, '没有可用的商品ID', 0)
            return
        
        start_time = time.time()
        try:
            product_id = self.test_data['product_ids'][0]
            update_data = {
                'name': f'更新后的商品_{uuid.uuid4().hex[:8]}',
                'price': 399.00
            }
            response = self.client.put(f'/products/{product_id}', update_data)
            duration = time.time() - start_time
            
            if response.get('code') == 0:
                TestReporter.record('更新商品', TestStatus.PASS, f"商品ID: {product_id}", duration)
            else:
                TestReporter.record('更新商品', TestStatus.FAIL, '更新失败', duration, details=response)
        except Exception as e:
            duration = time.time() - start_time
            TestReporter.record('更新商品', TestStatus.ERROR, str(e), duration, error=traceback.format_exc())
    
    # ==================== 代理商管理测试 ====================
    
    def test_agents_create(self):
        """测试创建代理商"""
        start_time = time.time()
        try:
            agent_data = {
                'name': f'测试代理_{uuid.uuid4().hex[:8]}',
                'phone1': f'138{int(time.time()) % 100000000:08d}',
                'phone2': '',
                'address': '测试地址123号',
                'yearlyTargets': {
                    'productA': 500,
                    'mixed': 300
                }
            }
            response = self.client.post('/agents', agent_data)
            duration = time.time() - start_time
            
            if response.get('code') == 0 and response.get('data', {}).get('id'):
                agent_id = response['data']['id']
                self.test_data['agent_ids'].append(agent_id)
                TestReporter.record('创建代理商', TestStatus.PASS, f"代理ID: {agent_id}", 
                                  duration, details={'agent_id': agent_id, 'phone': agent_data['phone1']})
            else:
                TestReporter.record('创建代理商', TestStatus.FAIL, '创建失败', duration, details=response)
        except Exception as e:
            duration = time.time() - start_time
            TestReporter.record('创建代理商', TestStatus.ERROR, str(e), duration, error=traceback.format_exc())
    
    def test_agents_list(self):
        """测试代理商列表"""
        start_time = time.time()
        try:
            response = self.client.get('/agents')
            duration = time.time() - start_time
            
            if response.get('code') == 0 and isinstance(response.get('data'), list):
                count = len(response['data'])
                TestReporter.record('代理商列表', TestStatus.PASS, f"共{count}个代理", 
                                  duration, details={'count': count})
            else:
                TestReporter.record('代理商列表', TestStatus.FAIL, '获取失败', duration, details=response)
        except Exception as e:
            duration = time.time() - start_time
            TestReporter.record('代理商列表', TestStatus.ERROR, str(e), duration, error=traceback.format_exc())
    
    def test_agents_get(self):
        """测试获取单个代理商"""
        if not self.test_data['agent_ids']:
            TestReporter.record('获取代理商', TestStatus.FAIL, '没有可用的代理ID', 0)
            return
        
        start_time = time.time()
        try:
            agent_id = self.test_data['agent_ids'][0]
            response = self.client.get(f'/agents/{agent_id}')
            duration = time.time() - start_time
            
            if response.get('code') == 0 and response.get('data', {}).get('id') == agent_id:
                TestReporter.record('获取代理商', TestStatus.PASS, f"代理ID: {agent_id}", duration)
            else:
                TestReporter.record('获取代理商', TestStatus.FAIL, '获取失败', duration, details=response)
        except Exception as e:
            duration = time.time() - start_time
            TestReporter.record('获取代理商', TestStatus.ERROR, str(e), duration, error=traceback.format_exc())
    
    def test_agents_update(self):
        """测试更新代理商"""
        if not self.test_data['agent_ids']:
            TestReporter.record('更新代理商', TestStatus.FAIL, '没有可用的代理ID', 0)
            return
        
        start_time = time.time()
        try:
            agent_id = self.test_data['agent_ids'][0]
            update_data = {
                'name': f'更新后的代理_{uuid.uuid4().hex[:8]}',
                'yearlyTargets': {
                    'productA': 600,
                    'mixed': 400
                }
            }
            response = self.client.put(f'/agents/{agent_id}', update_data)
            duration = time.time() - start_time
            
            if response.get('code') == 0:
                TestReporter.record('更新代理商', TestStatus.PASS, f"代理ID: {agent_id}", duration)
            else:
                TestReporter.record('更新代理商', TestStatus.FAIL, '更新失败', duration, details=response)
        except Exception as e:
            duration = time.time() - start_time
            TestReporter.record('更新代理商', TestStatus.ERROR, str(e), duration, error=traceback.format_exc())
    
    def test_agents_statistics(self):
        """测试代理商统计"""
        if not self.test_data['agent_ids']:
            TestReporter.record('代理统计', TestStatus.FAIL, '没有可用的代理ID', 0)
            return
        
        start_time = time.time()
        try:
            agent_id = self.test_data['agent_ids'][0]
            response = self.client.get(f'/agents/{agent_id}/statistics')
            duration = time.time() - start_time
            
            if response.get('code') == 0 and response.get('data'):
                TestReporter.record('代理统计', TestStatus.PASS, f"代理ID: {agent_id}", duration)
            else:
                TestReporter.record('代理统计', TestStatus.FAIL, '获取失败', duration, details=response)
        except Exception as e:
            duration = time.time() - start_time
            TestReporter.record('代理统计', TestStatus.ERROR, str(e), duration, error=traceback.format_exc())
    
    # ==================== 交易流水测试 ====================
    
    def test_transactions_recharge(self):
        """测试充值"""
        if not self.test_data['agent_ids']:
            TestReporter.record('充值', TestStatus.FAIL, '没有可用的代理ID', 0)
            return
        
        start_time = time.time()
        try:
            agent_id = self.test_data['agent_ids'][0]
            recharge_data = {
                'agentId': agent_id,
                'amount': 1000.00,
                'reason': 'payment',
                'remark': '测试充值'
            }
            response = self.client.post('/transactions/recharge', recharge_data)
            duration = time.time() - start_time
            
            if response.get('code') == 0 and response.get('data', {}).get('id'):
                tx_id = response['data']['id']
                self.test_data['transaction_ids'].append(tx_id)
                TestReporter.record('充值', TestStatus.PASS, f"交易ID: {tx_id}", duration)
            else:
                TestReporter.record('充值', TestStatus.FAIL, '充值失败', duration, details=response)
        except Exception as e:
            duration = time.time() - start_time
            TestReporter.record('充值', TestStatus.ERROR, str(e), duration, error=traceback.format_exc())
    
    def test_transactions_deduct(self):
        """测试扣款"""
        if not self.test_data['agent_ids']:
            TestReporter.record('扣款', TestStatus.FAIL, '没有可用的代理ID', 0)
            return
        
        start_time = time.time()
        try:
            agent_id = self.test_data['agent_ids'][0]
            deduct_data = {
                'agentId': agent_id,
                'amount': 100.00,
                'reason': 'shipping',
                'remark': '测试扣款'
            }
            response = self.client.post('/transactions/deduct', deduct_data)
            duration = time.time() - start_time
            
            if response.get('code') == 0 and response.get('data', {}).get('id'):
                tx_id = response['data']['id']
                self.test_data['transaction_ids'].append(tx_id)
                TestReporter.record('扣款', TestStatus.PASS, f"交易ID: {tx_id}", duration)
            else:
                TestReporter.record('扣款', TestStatus.FAIL, '扣款失败', duration, details=response)
        except Exception as e:
            duration = time.time() - start_time
            TestReporter.record('扣款', TestStatus.ERROR, str(e), duration, error=traceback.format_exc())
    
    def test_transactions_transfer(self):
        """测试调货"""
        if len(self.test_data['agent_ids']) < 2:
            TestReporter.record('调货', TestStatus.FAIL, '需要至少2个代理才能测试调货', 0)
            return
        
        if not self.test_data['product_ids']:
            TestReporter.record('调货', TestStatus.FAIL, '需要商品才能测试调货', 0)
            return
        
        start_time = time.time()
        try:
            from_agent_id = self.test_data['agent_ids'][0]
            to_agent_id = self.test_data['agent_ids'][1] if len(self.test_data['agent_ids']) > 1 else self.test_data['agent_ids'][0]
            product_id = self.test_data['product_ids'][0]
            
            transfer_data = {
                'fromAgentId': from_agent_id,
                'toAgentId': to_agent_id,
                'amount': 500.00,
                'productId': product_id,
                'quantity': 10
            }
            response = self.client.post('/transactions/transfer', transfer_data)
            duration = time.time() - start_time
            
            if response.get('code') == 0 and response.get('data', {}).get('inTxId'):
                TestReporter.record('调货', TestStatus.PASS, '调货成功', duration)
            else:
                TestReporter.record('调货', TestStatus.FAIL, '调货失败', duration, details=response)
        except Exception as e:
            duration = time.time() - start_time
            TestReporter.record('调货', TestStatus.ERROR, str(e), duration, error=traceback.format_exc())
    
    def test_transactions_list(self):
        """测试交易列表"""
        start_time = time.time()
        try:
            response = self.client.get('/transactions')
            duration = time.time() - start_time
            
            if response.get('code') == 0 and isinstance(response.get('data'), list):
                count = len(response['data'])
                TestReporter.record('交易列表', TestStatus.PASS, f"共{count}条记录", duration, 
                                  details={'count': count})
            else:
                TestReporter.record('交易列表', TestStatus.FAIL, '获取失败', duration, details=response)
        except Exception as e:
            duration = time.time() - start_time
            TestReporter.record('交易列表', TestStatus.ERROR, str(e), duration, error=traceback.format_exc())
    
    # ==================== 订单管理测试 ====================
    
    def test_orders_create(self):
        """测试创建订单"""
        if not self.test_data['agent_ids'] or not self.test_data['product_ids']:
            TestReporter.record('创建订单', TestStatus.FAIL, '需要代理和商品才能创建订单', 0)
            return
        
        start_time = time.time()
        try:
            agent_id = self.test_data['agent_ids'][0]
            product_id = self.test_data['product_ids'][0]
            
            order_data = {
                'agentId': agent_id,
                'items': [{
                    'productId': product_id,
                    'productName': '测试商品',
                    'quantity': 10,
                    'price': 299.00,
                    'weight': 5.5
                }],
                'totalWeight': 55.0,
                'totalAmount': 2990.00,
                'driverPhone': '13800000000',
                'images': []
            }
            response = self.client.post('/orders', order_data)
            duration = time.time() - start_time
            
            if response.get('code') == 0 and response.get('data', {}).get('id'):
                order_id = response['data']['id']
                self.test_data['order_ids'].append(order_id)
                TestReporter.record('创建订单', TestStatus.PASS, f"订单ID: {order_id}", duration)
            else:
                TestReporter.record('创建订单', TestStatus.FAIL, '创建失败', duration, details=response)
        except Exception as e:
            duration = time.time() - start_time
            TestReporter.record('创建订单', TestStatus.ERROR, str(e), duration, error=traceback.format_exc())
    
    def test_orders_list(self):
        """测试订单列表"""
        start_time = time.time()
        try:
            response = self.client.get('/orders')
            duration = time.time() - start_time
            
            if response.get('code') == 0 and isinstance(response.get('data'), list):
                count = len(response['data'])
                TestReporter.record('订单列表', TestStatus.PASS, f"共{count}个订单", duration, 
                                  details={'count': count})
            else:
                TestReporter.record('订单列表', TestStatus.FAIL, '获取失败', duration, details=response)
        except Exception as e:
            duration = time.time() - start_time
            TestReporter.record('订单列表', TestStatus.ERROR, str(e), duration, error=traceback.format_exc())
    
    def test_orders_get(self):
        """测试获取单个订单"""
        if not self.test_data['order_ids']:
            TestReporter.record('获取订单', TestStatus.FAIL, '没有可用的订单ID', 0)
            return
        
        start_time = time.time()
        try:
            order_id = self.test_data['order_ids'][0]
            response = self.client.get(f'/orders/{order_id}')
            duration = time.time() - start_time
            
            if response.get('code') == 0 and response.get('data', {}).get('id') == order_id:
                TestReporter.record('获取订单', TestStatus.PASS, f"订单ID: {order_id}", duration)
            else:
                TestReporter.record('获取订单', TestStatus.FAIL, '获取失败', duration, details=response)
        except Exception as e:
            duration = time.time() - start_time
            TestReporter.record('获取订单', TestStatus.ERROR, str(e), duration, error=traceback.format_exc())
    
    def test_orders_update_status(self):
        """测试更新订单状态"""
        if not self.test_data['order_ids']:
            TestReporter.record('更新订单状态', TestStatus.FAIL, '没有可用的订单ID', 0)
            return
        
        start_time = time.time()
        try:
            order_id = self.test_data['order_ids'][0]
            response = self.client.put(f'/orders/{order_id}/status', {'status': 'shipped'})
            duration = time.time() - start_time
            
            if response.get('code') == 0:
                TestReporter.record('更新订单状态', TestStatus.PASS, f"订单ID: {order_id}", duration)
            else:
                TestReporter.record('更新订单状态', TestStatus.FAIL, '更新失败', duration, details=response)
        except Exception as e:
            duration = time.time() - start_time
            TestReporter.record('更新订单状态', TestStatus.ERROR, str(e), duration, error=traceback.format_exc())
    
    # ==================== 促销活动测试 ====================
    
    def test_promotions_create(self):
        """测试创建促销活动"""
        if not self.test_data['product_ids']:
            TestReporter.record('创建促销', TestStatus.FAIL, '需要商品才能创建促销', 0)
            return
        
        start_time = time.time()
        try:
            product_id = self.test_data['product_ids'][0]
            promotion_data = {
                'name': f'测试促销_{uuid.uuid4().hex[:8]}',
                'description': '测试促销描述',
                'threshold': 100,
                'gifts': [{
                    'productId': product_id,
                    'quantity': 5
                }],
                'isActive': True
            }
            response = self.client.post('/promotions', promotion_data)
            duration = time.time() - start_time
            
            if response.get('code') == 0 and response.get('data', {}).get('id'):
                promo_id = response['data']['id']
                self.test_data['promotion_ids'].append(promo_id)
                TestReporter.record('创建促销', TestStatus.PASS, f"促销ID: {promo_id}", duration)
            else:
                TestReporter.record('创建促销', TestStatus.FAIL, '创建失败', duration, details=response)
        except Exception as e:
            duration = time.time() - start_time
            TestReporter.record('创建促销', TestStatus.ERROR, str(e), duration, error=traceback.format_exc())
    
    def test_promotions_list(self):
        """测试促销列表"""
        start_time = time.time()
        try:
            response = self.client.get('/promotions')
            duration = time.time() - start_time
            
            if response.get('code') == 0 and isinstance(response.get('data'), list):
                count = len(response['data'])
                TestReporter.record('促销列表', TestStatus.PASS, f"共{count}个促销", duration, 
                                  details={'count': count})
            else:
                TestReporter.record('促销列表', TestStatus.FAIL, '获取失败', duration, details=response)
        except Exception as e:
            duration = time.time() - start_time
            TestReporter.record('促销列表', TestStatus.ERROR, str(e), duration, error=traceback.format_exc())
    
    # ==================== 收款账户测试 ====================
    
    def test_payment_accounts_create(self):
        """测试创建收款账户"""
        start_time = time.time()
        try:
            account_data = {
                'name': f'测试账户_{uuid.uuid4().hex[:8]}',
                'accountNo': '6222000000000000',
                'bankName': '测试银行',
                'qrCode': ''
            }
            response = self.client.post('/payment-accounts', account_data)
            duration = time.time() - start_time
            
            if response.get('code') == 0 and response.get('data', {}).get('id'):
                account_id = response['data']['id']
                self.test_data['payment_account_ids'].append(account_id)
                TestReporter.record('创建收款账户', TestStatus.PASS, f"账户ID: {account_id}", duration)
            else:
                TestReporter.record('创建收款账户', TestStatus.FAIL, '创建失败', duration, details=response)
        except Exception as e:
            duration = time.time() - start_time
            TestReporter.record('创建收款账户', TestStatus.ERROR, str(e), duration, error=traceback.format_exc())
    
    def test_payment_accounts_list(self):
        """测试收款账户列表"""
        start_time = time.time()
        try:
            response = self.client.get('/payment-accounts')
            duration = time.time() - start_time
            
            if response.get('code') == 0 and isinstance(response.get('data'), list):
                count = len(response['data'])
                TestReporter.record('收款账户列表', TestStatus.PASS, f"共{count}个账户", duration, 
                                  details={'count': count})
            else:
                TestReporter.record('收款账户列表', TestStatus.FAIL, '获取失败', duration, details=response)
        except Exception as e:
            duration = time.time() - start_time
            TestReporter.record('收款账户列表', TestStatus.ERROR, str(e), duration, error=traceback.format_exc())
    
    def test_payment_accounts_transactions(self):
        """测试收款账户交易明细"""
        if not self.test_data['payment_account_ids']:
            TestReporter.record('收款账户交易明细', TestStatus.FAIL, '没有可用的账户ID', 0)
            return
        
        start_time = time.time()
        try:
            account_id = self.test_data['payment_account_ids'][0]
            response = self.client.get(f'/payment-accounts/{account_id}/transactions')
            duration = time.time() - start_time
            
            if response.get('code') == 0:
                TestReporter.record('收款账户交易明细', TestStatus.PASS, f"账户ID: {account_id}", duration)
            else:
                TestReporter.record('收款账户交易明细', TestStatus.FAIL, '获取失败', duration, details=response)
        except Exception as e:
            duration = time.time() - start_time
            TestReporter.record('收款账户交易明细', TestStatus.ERROR, str(e), duration, error=traceback.format_exc())
    
    # ==================== 统计数据测试 ====================
    
    def test_statistics(self):
        """测试统计数据"""
        start_time = time.time()
        try:
            response = self.client.get('/statistics')
            duration = time.time() - start_time
            
            if response.get('code') == 0 and response.get('data'):
                TestReporter.record('统计数据', TestStatus.PASS, '获取成功', duration)
            else:
                TestReporter.record('统计数据', TestStatus.FAIL, '获取失败', duration, details=response)
        except Exception as e:
            duration = time.time() - start_time
            TestReporter.record('统计数据', TestStatus.ERROR, str(e), duration, error=traceback.format_exc())
    
    # ==================== 司机管理测试 ====================
    
    def test_drivers_create(self):
        """测试创建司机"""
        start_time = time.time()
        try:
            driver_data = {
                'name': f'测试司机_{uuid.uuid4().hex[:8]}',
                'phone': f'139{int(time.time()) % 100000000:08d}'
            }
            response = self.client.post('/drivers', driver_data)
            duration = time.time() - start_time
            
            if response.get('code') == 0 and response.get('data', {}).get('id'):
                TestReporter.record('创建司机', TestStatus.PASS, '创建成功', duration)
            else:
                TestReporter.record('创建司机', TestStatus.FAIL, '创建失败', duration, details=response)
        except Exception as e:
            duration = time.time() - start_time
            TestReporter.record('创建司机', TestStatus.ERROR, str(e), duration, error=traceback.format_exc())
    
    def test_drivers_list(self):
        """测试司机列表"""
        start_time = time.time()
        try:
            response = self.client.get('/drivers')
            duration = time.time() - start_time
            
            if response.get('code') == 0 and isinstance(response.get('data'), list):
                count = len(response['data'])
                TestReporter.record('司机列表', TestStatus.PASS, f"共{count}个司机", duration, 
                                  details={'count': count})
            else:
                TestReporter.record('司机列表', TestStatus.FAIL, '获取失败', duration, details=response)
        except Exception as e:
            duration = time.time() - start_time
            TestReporter.record('司机列表', TestStatus.ERROR, str(e), duration, error=traceback.format_exc())
    
    # ==================== 车型管理测试 ====================
    
    def test_truck_types_create(self):
        """测试创建车型"""
        start_time = time.time()
        try:
            truck_data = {
                'name': f'测试车型_{uuid.uuid4().hex[:8]}',
                'minWeight': 1000,
                'maxWeight': 5000,
                'isDefault': False
            }
            response = self.client.post('/truck-types', truck_data)
            duration = time.time() - start_time
            
            if response.get('code') == 0 and response.get('data', {}).get('id'):
                TestReporter.record('创建车型', TestStatus.PASS, '创建成功', duration)
            else:
                TestReporter.record('创建车型', TestStatus.FAIL, '创建失败', duration, details=response)
        except Exception as e:
            duration = time.time() - start_time
            TestReporter.record('创建车型', TestStatus.ERROR, str(e), duration, error=traceback.format_exc())
    
    def test_truck_types_list(self):
        """测试车型列表"""
        start_time = time.time()
        try:
            response = self.client.get('/truck-types')
            duration = time.time() - start_time
            
            if response.get('code') == 0 and isinstance(response.get('data'), list):
                count = len(response['data'])
                TestReporter.record('车型列表', TestStatus.PASS, f"共{count}种车型", duration, 
                                  details={'count': count})
            else:
                TestReporter.record('车型列表', TestStatus.FAIL, '获取失败', duration, details=response)
        except Exception as e:
            duration = time.time() - start_time
            TestReporter.record('车型列表', TestStatus.ERROR, str(e), duration, error=traceback.format_exc())
    
    def test_truck_types_update(self):
        """测试更新车型"""
        start_time = time.time()
        try:
            # 先获取车型列表
            list_response = self.client.get('/truck-types')
            if list_response.get('code') == 0 and list_response.get('data'):
                truck_types = list_response['data']
                if truck_types:
                    truck_id = truck_types[0]['id']
                    update_data = {
                        'name': f'更新后的车型_{uuid.uuid4().hex[:8]}',
                        'minWeight': 1200,
                        'maxWeight': 6000
                    }
                    response = self.client.put(f'/truck-types/{truck_id}', update_data)
                    duration = time.time() - start_time
                    
                    if response.get('code') == 0:
                        TestReporter.record('更新车型', TestStatus.PASS, f"车型ID: {truck_id}", duration)
                    else:
                        TestReporter.record('更新车型', TestStatus.FAIL, '更新失败', duration, details=response)
                else:
                    TestReporter.record('更新车型', TestStatus.FAIL, '没有可用的车型', time.time() - start_time)
            else:
                TestReporter.record('更新车型', TestStatus.FAIL, '无法获取车型列表', time.time() - start_time)
        except Exception as e:
            duration = time.time() - start_time
            TestReporter.record('更新车型', TestStatus.ERROR, str(e), duration, error=traceback.format_exc())
    
    # ==================== 清理测试数据 ====================
    
    def cleanup_test_data(self):
        """清理测试数据（可选）"""
        # 注意：实际项目中可能需要根据业务需求决定是否清理测试数据
        TestReporter.record('清理测试数据', TestStatus.PASS, '测试数据保留在数据库中（可根据需要清理）', 0)


def main():
    """主函数"""
    tester = NomurTester()
    tester.run_all_tests()
    TestReporter.generate_report()


if __name__ == '__main__':
    main()

