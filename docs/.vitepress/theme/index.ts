import type { Theme } from 'vitepress';
import DefaultTheme from 'vitepress/theme';
import { defineAsyncComponent, h } from 'vue';
import EasingCurve from './components/EasingCurve.vue';
import HeroArt from './components/HeroArt.vue';
import HomeShortcuts from './components/HomeShortcuts.vue';
import IndicatorDemo from './components/IndicatorDemo.vue';
import IndicatorGallery from './components/IndicatorGallery.vue';
import LayoutVisualizer from './components/LayoutVisualizer.vue';
import LoaderKitPreview from './components/LoaderKitPreview.vue';
import PlaybackDemo from './components/PlaybackDemo.vue';
import ProgressGallery from './components/ProgressGallery.vue';
import SpecExample from './components/SpecExample.vue';
import TrackTimeline from './components/TrackTimeline.vue';
import './style.css';

export default {
  extends: DefaultTheme,
  Layout: () => h(DefaultTheme.Layout, null, { 'home-hero-image': () => h(HeroArt) }),
  enhanceApp({ app }) {
    app.component('LoaderKitPreview', LoaderKitPreview);
    app.component('IndicatorGallery', IndicatorGallery);
    app.component('IndicatorDemo', IndicatorDemo);
    app.component('PlaybackDemo', PlaybackDemo);
    app.component('ProgressGallery', ProgressGallery);
    app.component('LayoutVisualizer', LayoutVisualizer);
    app.component('EasingCurve', EasingCurve);
    app.component('TrackTimeline', TrackTimeline);
    app.component('SpecExample', SpecExample);
    app.component('SpecPlayground', defineAsyncComponent(() => import('./components/SpecPlayground.vue')));
    app.component('HeroArt', HeroArt);
    app.component('HomeShortcuts', HomeShortcuts);
  },
} satisfies Theme;
