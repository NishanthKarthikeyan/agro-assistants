import re

with open('F:/Thanthi/AgroPulse AI/frontend/src/pages/admin/AdminDashboard.jsx', 'r', encoding='utf-8') as f:
    text = f.read()

# Update total users text
text = re.sub(r'sub: `\$\{statsData.buyers\} buyers, \$\{statsData.sellers\} sellers`', 'sub: `${statsData.buyers} buyers`', text)

# Remove pending seller approvals from the label
text = re.sub(r'value: statsData.pendingSellerApprovals \+ statsData.pendingProductApprovals', 'value: statsData.pendingProductApprovals', text)
text = re.sub(r'sub: `\$\{statsData.pendingSellerApprovals\} sellers, \$\{statsData.pendingProductApprovals\} products`', 'sub: `${statsData.pendingProductApprovals} products`', text)

# Remove the alerts for sellers
text = re.sub(r'statsData\.pendingSellerApprovals > 0 \|\| ', '', text)
text = re.sub(r'\{statsData\.pendingSellerApprovals\} seller\{statsData\.pendingSellerApprovals !== 1 \? \'s\' : \'\'\} and ', '', text)
text = re.sub(r'\s*<Link to="/admin/sellers".*?</Link>', '', text)

# Remove Seller column from Recent Orders table
text = re.sub(r'\s*<th className="pb-3 font-medium">Seller</th>', '', text)
text = re.sub(r"\s*<td className=\"py-3 text-gray-500\">\{o\.sellerName \|\| '-'\}</td>", '', text)

with open('F:/Thanthi/AgroPulse AI/frontend/src/pages/admin/AdminDashboard.jsx', 'w', encoding='utf-8') as f:
    f.write(text)
