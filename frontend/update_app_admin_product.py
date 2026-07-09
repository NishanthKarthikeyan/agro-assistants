import re

with open('F:/Thanthi/AgroPulse AI/frontend/src/App.jsx', 'r', encoding='utf-8') as f:
    text = f.read()

text = text.replace("import AdminProducts  from './pages/admin/AdminProducts';", "import AdminProducts  from './pages/admin/AdminProducts';\nimport AdminAddProduct from './pages/admin/AdminAddProduct';")

text = text.replace('<Route path="/admin/products"   element={<PrivateRoute allowedRoles={[\'admin\']}><AdminProducts /></PrivateRoute>} />', '<Route path="/admin/products"   element={<PrivateRoute allowedRoles={[\'admin\']}><AdminProducts /></PrivateRoute>} />\n      <Route path="/admin/products/add"   element={<PrivateRoute allowedRoles={[\'admin\']}><AdminAddProduct /></PrivateRoute>} />\n      <Route path="/admin/products/edit/:id" element={<PrivateRoute allowedRoles={[\'admin\']}><AdminAddProduct /></PrivateRoute>} />')

with open('F:/Thanthi/AgroPulse AI/frontend/src/App.jsx', 'w', encoding='utf-8') as f:
    f.write(text)
