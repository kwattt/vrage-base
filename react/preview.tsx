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
  // create links for all components so we can navigate to them
  const componentLinks = Object.keys(components).map((component) => {
    return (
      <li key={component}>
        <a href={`?component=${component}`}>{component}</a>
      </li>
    );
  });

  ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
      <ul>{componentLinks}</ul>
    </React.StrictMode>
  );
}