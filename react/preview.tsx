import React from 'react';
import ReactDOM from 'react-dom/client';

// Import all components dynamically
const components = import.meta.glob('./../**/*.tsx');
console.log('components', components);
// Get the component path from the URL
const urlParams = new URLSearchParams(window.location.search);
const componentPath = urlParams.get('component');
console.log('componentPath', componentPath);

if (componentPath && components[componentPath]) {
  console.log('Loading component', componentPath);
  components[`${componentPath}`]().then((module: any) => {
    const Component = module.default;

    if (!Component) {
      console.error(`Component not found in ${componentPath}`);
      return;
    }

    ReactDOM.createRoot(document.getElementById('root')!).render(
      <React.StrictMode>
        <Component />
      </React.StrictMode>
    );
  });
} else {
  document.getElementById('root')!.innerHTML =
    '<h1>Component not found. Specify it in the URL, e.g., ?component=main/cef/MyComponent</h1>';
}