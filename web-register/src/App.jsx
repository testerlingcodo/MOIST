import { useState } from 'react';
import RegisterPage from './RegisterPage.jsx';
import SuccessPage from './SuccessPage.jsx';

export default function App() {
  const [result, setResult] = useState(null);

  if (result) return <SuccessPage result={result} />;
  return <RegisterPage onSuccess={setResult} />;
}
