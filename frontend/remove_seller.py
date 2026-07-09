import re

with open('F:/Thanthi/AgroPulse AI/frontend/src/App.jsx', 'r', encoding='utf-8') as f:
    text = f.read()

# Replace chunks
text = text.replace("// ── Seller ────────────────────────────────────────────────────────────────────\nimport SellerDashboard from './pages/seller/SellerDashboard';\nimport SellerProducts  from './pages/seller/SellerProducts';\nimport AddProduct      from './pages/seller/AddProduct';\nimport SellerOrders    from './pages/seller/SellerOrders';\nimport SellerProfile   from './pages/seller/SellerProfile';\nimport BecomeSeller    from './pages/seller/BecomeSeller';\n", '')
text = text.replace("import AdminSellers   from './pages/admin/AdminSellers';\n", '')

text = re.sub(r'// Seller guard.*?return children;\n}\n', '', text, flags=re.DOTALL)

text = text.replace("seller: '/seller', ", '')
text = re.sub(r'\s*\{/\* ── Become a Seller.*?<Route path="/become-seller".*?/>', '', text, flags=re.DOTALL)
text = text.replace("allowedRoles={['buyer', 'seller']}", "allowedRoles={['buyer']}")
text = re.sub(r'\s*\{/\* ── Seller ──.*?<Route path="/seller/profile".*?/>', '', text, flags=re.DOTALL)
text = re.sub(r'\s*<Route path="/admin/sellers".*?/>', '', text)

with open('F:/Thanthi/AgroPulse AI/frontend/src/App.jsx', 'w', encoding='utf-8') as f:
    f.write(text)
