// Khung dùng chung cho các trang công khai như trang chủ, chuyên khoa và liên hệ.
// Khung gồm đầu trang, nội dung trang hiện tại và chân trang.

import { Outlet, useLocation } from 'react-router-dom';
import Header from './Header';
import Footer from './Footer';
import ChatboxWidget from '@/modules/chat-ai/components/ChatboxWidget';

export default function PublicLayout() {
  const location = useLocation();
  const isHomePage = location.pathname === '/';

  return (
    <div className="d-flex flex-column min-vh-100">
      <Header />
      <main className="flex-grow-1" style={{ paddingTop: '80px' }}>
        <Outlet />
      </main>
      <Footer />
      {/* Chatbox chỉ phục vụ khách vãng lai/bệnh nhân tại trang chủ công khai. */}
      {isHomePage && <ChatboxWidget />}
    </div>
  );
}
