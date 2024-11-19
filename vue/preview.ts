// vue/preview.ts
import { createApp, defineAsyncComponent, h } from 'vue';

// Import all Vue components dynamically
const components = import.meta.glob([
  './../src/**/*.vue',
]);

const urlParams = new URLSearchParams(window.location.search);
const componentPath = urlParams.get('component');

const mountApp = async () => {
  if (componentPath && components[componentPath]) {
    try {
      const AsyncComponent = defineAsyncComponent(() => components[componentPath]());
      const app = createApp({
        render: () => h(AsyncComponent)
      });
      app.mount('#app');
    } catch (error) {
      console.error(`Error loading component ${componentPath}:`, error);
    }
  } else {
    // Show component list
    const app = createApp({
      setup() {
        return () => h('div', [
          h('h1', 'Available Components'),
          h('ul', 
            Object.keys(components).map(component => 
              h('li', { key: component }, [
                h('a', { 
                  href: `?component=${component}`,
                  style: 'color: blue; text-decoration: underline;'
                }, component)
              ])
            )
          )
        ]);
      }
    });
    app.mount('#app');
  }
};

mountApp().catch(console.error);