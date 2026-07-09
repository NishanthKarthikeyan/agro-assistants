import { format, formatDistanceToNow, isToday, isYesterday } from 'date-fns';

export const formatCurrency = (amount) =>
  `₹${Number(amount).toLocaleString('en-IN', { minimumFractionDigits: 0 })}`;

export const formatDate = (timestamp) => {
  if (!timestamp) return 'N/A';
  const date = timestamp?.toDate ? timestamp.toDate() : new Date(timestamp);
  if (isToday(date)) return `Today, ${format(date, 'h:mm a')}`;
  if (isYesterday(date)) return `Yesterday, ${format(date, 'h:mm a')}`;
  return format(date, 'dd MMM yyyy, h:mm a');
};

export const timeAgo = (timestamp) => {
  if (!timestamp) return '';
  const date = timestamp?.toDate ? timestamp.toDate() : new Date(timestamp);
  return formatDistanceToNow(date, { addSuffix: true });
};

export const getStatusColor = (status) => {
  const colors = {
    pending: 'bg-yellow-100 text-yellow-800',
    confirmed: 'bg-blue-100 text-blue-800',
    packed: 'bg-purple-100 text-purple-800',
    dispatched: 'bg-orange-100 text-orange-800',
    out_for_delivery: 'bg-teal-100 text-teal-800',
    delivered: 'bg-green-100 text-green-800',
    cancelled: 'bg-red-100 text-red-800',
    paid: 'bg-green-100 text-green-800',
    refunded: 'bg-gray-100 text-gray-800',
  };
  return colors[status] || 'bg-gray-100 text-gray-800';
};

export const getStatusLabel = (status) =>
  status?.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()) || status;

export const getCategoryIcon = (category) => {
  const icons = {
    vegetables: '🥦',
    fruits: '🍎',
    grains: '🌾',
    dairy: '🥛',
    herbs: '🌿',
  };
  return icons[category] || '🛒';
};

export const truncate = (str, n = 60) =>
  str && str.length > n ? str.slice(0, n) + '...' : str;
