export function getSpecialtyIcon(name: string): string {
  const n = name.toLowerCase();
  if (n.includes('tổng quát')) return 'health_and_safety';
  if (n.includes('tim mạch')) return 'favorite';
  if (n.includes('nhi')) return 'child_care';
  if (n.includes('da liễu')) return 'spa';
  if (n.includes('tai mũi họng')) return 'hearing';
  if (n.includes('sản') || n.includes('phụ khoa')) return 'pregnant_woman';
  if (n.includes('mắt') || n.includes('nhãn khoa')) return 'visibility';
  if (n.includes('cơ xương khớp')) return 'accessibility_new';
  if (n.includes('thần kinh')) return 'psychology';
  if (n.includes('tiêu hóa')) return 'water_drop';
  if (n.includes('hô hấp')) return 'air';
  if (n.includes('răng hàm mặt')) return 'face';
  if (n.includes('tâm lý') || n.includes('tâm thần')) return 'psychology';
  
  return 'medical_services'; // Fallback
}

export function getServiceIcon(name: string): string {
  const n = name.toLowerCase();
  if (n.includes('khám') || n.includes('tư vấn')) {
    if (n.includes('tổng quát')) return 'health_and_safety';
    if (n.includes('tim mạch')) return 'favorite';
    if (n.includes('nhi')) return 'child_care';
    if (n.includes('da liễu')) return 'spa';
    if (n.includes('tai mũi họng')) return 'hearing';
    if (n.includes('sản') || n.includes('phụ khoa')) return 'pregnant_woman';
    if (n.includes('mắt')) return 'visibility';
    if (n.includes('cơ xương khớp')) return 'accessibility_new';
  }
  if (n.includes('xét nghiệm') || n.includes('máu')) return 'science';
  if (n.includes('siêu âm') || n.includes('x-quang') || n.includes('xquang') || n.includes('mri') || n.includes('cắt lớp')) return 'biotech';
  if (n.includes('nội soi')) return 'medication';
  if (n.includes('tiêm') || n.includes('vaccine')) return 'vaccines';
  if (n.includes('đo điện tim') || n.includes('ecg')) return 'monitor_heart';
  
  return 'medical_information'; // Generic medical service fallback
}
