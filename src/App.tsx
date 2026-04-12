import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import Home from '@/pages/Home'
import Search from '@/pages/Search'
import MerchantDetail from '@/pages/MerchantDetail'
import Auth from '@/pages/Auth'
import MerchantAdmin from '@/pages/MerchantAdmin'

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/search" element={<Search />} />
        <Route path="/merchant/:id" element={<MerchantDetail />} />
        <Route path="/auth" element={<Auth />} />
        <Route path="/merchant-admin" element={<MerchantAdmin />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  )
}
