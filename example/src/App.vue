<script setup lang="ts">
import Card from './components/Card.vue';
import Button from './components/Button.vue';
</script>

<template>
  <div class="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-8">
    <header class="mb-12 text-center">
      <h1 class="text-4xl font-bold text-gray-900 mb-2">Vue Rewrite Demo</h1>
      <p class="text-gray-600">Click on elements to edit their styles</p>
    </header>

    <main class="max-w-4xl mx-auto space-y-8">
      <section class="bg-white rounded-2xl shadow-lg p-8">
        <h2 class="text-2xl font-semibold text-gray-800 mb-6">Interactive Components</h2>
        <div class="flex flex-wrap gap-4">
          <Button variant="primary">Primary</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="danger">Danger</Button>
        </div>
      </section>

      <section class="grid md:grid-cols-2 gap-6">
        <Card title="Card Title 1" variant="default">
          <p class="text-gray-600">This is a sample card component. You can click on any element to see the Vue Rewrite overlay and edit its styles in real-time.</p>
        </Card>
        <Card title="Card Title 2" variant="elevated">
          <p class="text-gray-600">Try changing the padding, colors, and typography using the property panel on the right.</p>
        </Card>
      </section>

      <section class="bg-white rounded-2xl shadow-lg p-8">
        <h2 class="text-2xl font-semibold text-gray-800 mb-4">Layout Example</h2>
        <div class="flex gap-4 mb-4">
          <div class="w-16 h-16 bg-blue-500 rounded-lg flex items-center justify-center text-white font-bold">1</div>
          <div class="w-16 h-16 bg-green-500 rounded-lg flex items-center justify-center text-white font-bold">2</div>
          <div class="w-16 h-16 bg-yellow-500 rounded-lg flex items-center justify-center text-white font-bold">3</div>
        </div>
        <p class="text-gray-600">Box elements with different background colors. Click on boxes to change their size, color, and border radius.</p>
      </section>

      <section class="bg-white rounded-2xl shadow-lg p-8">
        <h2 class="text-2xl font-semibold text-gray-800 mb-4">Text Formatting</h2>
        <div class="space-y-2">
          <p class="text-lg font-bold text-gray-900">Bold Heading Text</p>
          <p class="text-base text-gray-700">Regular paragraph text with <span class="font-semibold text-indigo-600">emphasized</span> parts.</p>
          <p class="text-sm text-gray-500">Small caption text</p>
        </div>
      </section>
    </main>

    <footer class="mt-12 text-center text-gray-500 text-sm">
      <p>Vue Rewrite — Visual Editor for Vue 3</p>
    </footer>
  </div>
</template>
