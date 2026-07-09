import re

with open('F:/Thanthi/AgroPulse AI/frontend/src/pages/admin/AdminAddProduct.jsx', 'r', encoding='utf-8') as f:
    text = f.read()

text = text.replace('export default function AddProduct()', 'export default function AdminAddProduct()')
text = re.sub(r"sellerLocation: userProfile\?\.farmLocation \|\| userProfile\?\.sellerProfile\?\.location \|\| ''", "sellerLocation: ''", text)
text = text.replace("navigate('/seller/products')", "navigate('/admin/products')")
text = text.replace("await api.get(`/api/seller/products/${editId}`)", "await api.get(`/api/products/${editId}`)")
text = text.replace("await api.put(`/api/seller/products/${editId}`", "await api.put(`/api/admin/products/${editId}`")
text = text.replace("await api.post('/api/seller/products'", "await api.post('/api/admin/products'")

with open('F:/Thanthi/AgroPulse AI/frontend/src/pages/admin/AdminAddProduct.jsx', 'w', encoding='utf-8') as f:
    f.write(text)
