import * as React from 'react';
import { createRoot } from 'react-dom/client'; // Updated import for React 18+
import { PrimaryButton, TextField } from '@fluentui/react';

const App: React.FC = () => {
  return (
    <div style={{ padding: 20 }}>
      <h1>Achievements</h1>
      <TextField label="Select achievement" />
      <PrimaryButton text="Click here" />
    </div>
  );
};

const container = document.getElementById('root');
if (container) {
  const root = createRoot(container);
  root.render(<App />);
}
