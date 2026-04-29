<script setup lang="ts">
import Card from './components/Card.vue';
import Button from './components/Button.vue';
</script>

<template>
  <div class="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-8" data-vr-id="vr-mo9w2wso-w">
    <header class="mb-12 text-center" data-vr-id="vr-mo9w2wso-x">
      <h1 class="text-4xl font-bold text-gray-900 mb-2" data-vr-id="vr-mo9w2wso-y">Vue Rewrite Demo</h1>
      <p class="text-gray-600" data-vr-id="vr-mo9w2wso-z">Click on elements to edit their styles</p>
    </header>
    <main class="max-w-4xl mx-auto space-y-8" data-vr-id="vr-mo9w2wso-10">
      <section class="bg-white rounded-2xl shadow-lg p-8" data-vr-id="vr-mo9w2wso-11">
        <h2 class="text-2xl font-semibold text-gray-800 mb-6" data-vr-id="vr-mo9w2wso-12">Interactive Components</h2>
        <div class="flex flex-wrap gap-4" data-vr-id="vr-mo9w2wso-13"><Button variant="primary"
            data-vr-id="vr-mo9w2wso-14">Primary</Button><Button variant="secondary"
            data-vr-id="vr-mo9w2wso-15">Secondary</Button><Button variant="danger"
            data-vr-id="vr-mo9w2wso-16">Danger</Button></div>
      </section>
      <section class="grid md:grid-cols-2 gap-6" data-vr-id="vr-mo9w2wso-17">
        <Card title="Card Title 1" variant="default" data-vr-id="vr-mo9w2wso-18">
          <p class="text-gray-600" data-vr-id="vr-mo9w2wso-19">This is a sample card component. You can click on any
            element to see the Vue Rewrite overlay and edit its styles in real-time.</p>
        </Card>
        <Card title="Card Title 2" variant="elevated" data-vr-id="vr-mo9w2wso-1a">
          <p class="text-gray-600" data-vr-id="vr-mo9w2wso-1b">Try changing the padding, colors, and typography using
            the property panel on the right.</p>
        </Card>
      </section>
      <section class="bg-white rounded-2xl shadow-lg p-8" data-vr-id="vr-mo9w2wso-1c">
        <h2 class="text-2xl font-semibold text-gray-800 mb-4" data-vr-id="vr-mo9w2wso-1d">Layout Example</h2>
        <div class="flex gap-4 mb-4" data-vr-id="vr-mo9w2wso-1e">
          <div class="w-16 h-16 bg-blue-500 rounded-lg flex items-center justify-center text-white font-bold"
            data-vr-id="vr-mo9w2wso-1f">1</div>
          <div class="w-16 h-16 bg-green-500 rounded-lg flex items-center justify-center text-white font-bold"
            data-vr-id="vr-mo9w2wso-1g">2</div>
          <div class="w-16 h-16 bg-yellow-500 rounded-lg flex items-center justify-center text-white font-bold"
            data-vr-id="vr-mo9w2wso-1h">3</div>
        </div>
        <p class="text-gray-600" data-vr-id="vr-mo9w2wso-1i">Box elements with different background colors. Click on
          boxes to change their size, color, and border radius.</p>
      </section>
      <section class="bg-white rounded-2xl shadow-lg p-8" data-vr-id="vr-mo9w2wso-1j">
        <h2 class="text-2xl font-semibold text-gray-800 mb-4" data-vr-id="vr-mo9w2wso-1k">Text Formatting</h2>
        <div class="space-y-2" data-vr-id="vr-mo9w2wso-1l">
          <p class="text-lg font-bold text-gray-900" data-vr-id="vr-mo9w2wso-1m">Bold Heading Text</p>
          <p class="text-base text-gray-700" data-vr-id="vr-mo9w2wso-1n">Regular paragraph text with <span
              class="font-semibold text-indigo-600" data-vr-id="vr-mo9w2wso-1o">emphasized</span> parts.</p>
          <p class="text-sm text-gray-500" data-vr-id="vr-mo9w2wso-1p">Small caption text</p>
        </div>
      </section>
    </main>
    <footer class="mt-12 text-center text-gray-500 text-sm" data-vr-id="vr-mo9w2wso-1q">
      <p data-vr-id="vr-mo9w2wso-1r">Vue Rewrite — Visual Editor for Vue 3</p>
    </footer>
  </div>
</template>
