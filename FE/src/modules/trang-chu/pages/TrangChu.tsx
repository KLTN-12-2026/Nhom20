import HeroSection from '../components/HeroSection';
import ProcessGuide from '../components/ProcessGuide';
import HomeServicesSection from '@/modules/dich-vu/components/HomeServicesSection';
import HomeDirectorySections from '../components/HomeDirectorySections';

export default function TrangChu() {
  return (
    <>
      <HeroSection />
      <ProcessGuide />
      <HomeDirectorySections />
      <HomeServicesSection />
    </>
  );
}
