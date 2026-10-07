import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { type DefaultTheme, type HeadConfig, defineConfig } from 'vitepress';

const repo = 'https://github.com/maitrungduc1410/loader-kit';
const base = '/loader-kit/';
// Production origin + base. Sitemap URLs and canonical links are built from it.
const site = `https://maitrungduc1410.github.io${base}`;
const brand = '#7c3aed';
const { version } = JSON.parse(readFileSync(new URL('../../spec/package.json', import.meta.url), 'utf8')) as {
  version: string;
};
const released = version !== '0.0.0';

const root = (path: string) => fileURLToPath(new URL(`../../${path}`, import.meta.url));

const sections = {
  guide: ['', 'getting-started', 'indicators', 'customizing', 'playback', 'faq'],
  platforms: ['web', 'android', 'apple', 'windows', 'react-native'],
  spec: ['', 'layouts', 'shapes', 'tracks', 'timing', 'params', 'using', 'reference'],
  tools: ['playground', 'json-schema', 'ai'],
} as const;
type Section = keyof typeof sections;
type PageLabels = { [S in Section]: Record<(typeof sections)[S][number], string> };

interface Labels {
  nav: { guide: string; platforms: string; spec: string; playground: string };
  groups: Record<Section, string>;
  pages: PageLabels;
  changelog: string;
}

function sidebar(prefix: string, l: Labels): DefaultTheme.SidebarItem[] {
  return (Object.keys(sections) as Section[]).map((section) => ({
    text: l.groups[section],
    collapsed: false,
    items: sections[section].map((slug) => ({
      text: (l.pages[section] as Record<string, string>)[slug],
      link: `${prefix}/${section}/${slug}`,
    })),
  }));
}

function themeConfig(prefix: string, l: Labels): DefaultTheme.Config {
  return {
    nav: [
      { text: l.nav.guide, link: `${prefix}/guide/`, activeMatch: `^${prefix}/guide/` },
      {
        text: l.nav.platforms,
        activeMatch: `^${prefix}/platforms/`,
        items: sections.platforms.map((slug) => ({
          text: l.pages.platforms[slug],
          link: `${prefix}/platforms/${slug}`,
        })),
      },
      { text: l.nav.spec, link: `${prefix}/spec/`, activeMatch: `^${prefix}/spec/` },
      { text: l.nav.playground, link: `${prefix}/tools/playground`, activeMatch: `^${prefix}/tools/playground` },
      {
        text: released ? `v${version}` : l.changelog,
        items: [
          { text: l.changelog, link: `${repo}/releases` },
          { text: '@loader-kit/web', link: 'https://www.npmjs.com/package/@loader-kit/web' },
          { text: '@loader-kit/spec', link: 'https://www.npmjs.com/package/@loader-kit/spec' },
        ],
      },
    ],
    sidebar: { [`${prefix}/`]: sidebar(prefix, l) },
  };
}

const en: Labels = {
  nav: { guide: 'Guide', platforms: 'Platforms', spec: 'Custom indicators', playground: 'Playground' },
  groups: { guide: 'Guide', platforms: 'Platforms', spec: 'Custom indicators', tools: 'Tools' },
  changelog: 'Changelog',
  pages: {
    guide: {
      '': 'What is LoaderKit?',
      'getting-started': 'Getting started',
      'indicators': 'Built-in indicators',
      'customizing': 'Params, colors and size',
      'playback': 'Playback',
      'faq': 'FAQ',
    },
    platforms: {
      'web': 'Web',
      'android': 'Android',
      'apple': 'iOS and macOS',
      'windows': 'Windows',
      'react-native': 'React Native',
    },
    spec: {
      '': 'Your first indicator',
      'layouts': 'Layouts',
      'shapes': 'Shapes',
      'tracks': 'Tracks and easing',
      'timing': 'Timing and stagger',
      'params': 'Params',
      'using': 'Loading specs at runtime',
      'reference': 'Spec reference',
    },
    tools: { 'playground': 'Playground', 'json-schema': 'JSON Schema', 'ai': 'Writing specs with AI' },
  },
};

const vi: Labels = {
  nav: { guide: 'Hướng dẫn', platforms: 'Nền tảng', spec: 'Indicator tùy chỉnh', playground: 'Playground' },
  groups: { guide: 'Hướng dẫn', platforms: 'Nền tảng', spec: 'Indicator tùy chỉnh', tools: 'Công cụ' },
  changelog: 'Lịch sử phát hành',
  pages: {
    guide: {
      '': 'LoaderKit là gì?',
      'getting-started': 'Bắt đầu',
      'indicators': 'Indicator có sẵn',
      'customizing': 'Params, màu và kích thước',
      'playback': 'Điều khiển animation',
      'faq': 'Câu hỏi thường gặp',
    },
    platforms: {
      'web': 'Web',
      'android': 'Android',
      'apple': 'iOS và macOS',
      'windows': 'Windows',
      'react-native': 'React Native',
    },
    spec: {
      '': 'Indicator đầu tiên',
      'layouts': 'Layout',
      'shapes': 'Shape',
      'tracks': 'Track và easing',
      'timing': 'Timing và stagger',
      'params': 'Params',
      'using': 'Load spec lúc runtime',
      'reference': 'Spec reference',
    },
    tools: { 'playground': 'Playground', 'json-schema': 'JSON Schema', 'ai': 'Viết spec với AI' },
  },
};

const zh: Labels = {
  nav: { guide: '指南', platforms: '平台', spec: '自定义加载动画', playground: 'Playground' },
  groups: { guide: '指南', platforms: '平台', spec: '自定义加载动画', tools: '工具' },
  changelog: '更新日志',
  pages: {
    guide: {
      '': 'LoaderKit 是什么？',
      'getting-started': '快速开始',
      'indicators': '内置加载动画',
      'customizing': '参数、颜色与尺寸',
      'playback': '播放控制',
      'faq': '常见问题',
    },
    platforms: {
      'web': 'Web',
      'android': 'Android',
      'apple': 'iOS 与 macOS',
      'windows': 'Windows',
      'react-native': 'React Native',
    },
    spec: {
      '': '第一个加载动画',
      'layouts': '布局',
      'shapes': '形状',
      'tracks': 'Track 与 easing',
      'timing': '时序与 stagger',
      'params': '参数',
      'using': '运行时加载 spec',
      'reference': 'Spec 参考',
    },
    tools: { 'playground': 'Playground', 'json-schema': 'JSON Schema', 'ai': '用 AI 编写 spec' },
  },
};

// SEO: locale metadata used for hreflang, og:locale and the preview image alt text.
const seoLocales = {
  root: {
    prefix: '',
    lang: 'en-US',
    og: 'en_US',
    imageAlt: 'LoaderKit: a ring of violet dots fading in turn, next to the tagline "One JSON spec, native loaders everywhere"',
  },
  vi: {
    prefix: 'vi/',
    lang: 'vi-VN',
    og: 'vi_VN',
    imageAlt: 'LoaderKit: vòng chấm màu tím mờ dần lần lượt, cạnh dòng chữ "One JSON spec, native loaders everywhere"',
  },
  zh: {
    prefix: 'zh/',
    lang: 'zh-CN',
    og: 'zh_CN',
    imageAlt: 'LoaderKit：一圈依次淡出的紫色圆点，旁边是标语 "One JSON spec, native loaders everywhere"',
  },
} as const;
type SeoLocale = keyof typeof seoLocales;

function localeOf(page: string): SeoLocale {
  const first = page.split('/')[0];
  return first === 'vi' || first === 'zh' ? first : 'root';
}

/** `vi/guide/index.md` -> `vi/guide/`, `guide/faq.md` -> `guide/faq`. */
function pageUrl(page: string): string {
  return page.replace(/(^|\/)index\.md$/, '$1').replace(/\.md$/, '');
}

const description = 'Loading indicators described as JSON, rendered natively on Android, iOS, macOS, Windows and the web.';

const jsonLd = (inLanguage: string, pageDescription: string) => ({
  '@context': 'https://schema.org',
  '@type': 'SoftwareSourceCode',
  'name': 'LoaderKit',
  'description': pageDescription,
  'url': site,
  'codeRepository': repo,
  'license': 'https://opensource.org/licenses/MIT',
  'programmingLanguage': ['TypeScript', 'Kotlin', 'Swift', 'C#'],
  'runtimePlatform': ['Android', 'iOS', 'macOS', 'Windows', 'Web'],
  ...(released ? { version } : {}),
  'inLanguage': inLanguage,
  'author': { '@type': 'Person', 'name': 'Duc Trung Mai', 'url': 'https://github.com/maitrungduc1410' },
});

export default defineConfig({
  title: 'LoaderKit',
  description,
  base,
  cleanUrls: true,
  lastUpdated: true,
  srcExclude: ['examples/**', 'README.md'],
  head: [
    ['link', { rel: 'icon', href: `${base}favicon.ico`, sizes: '32x32' }],
    ['link', { rel: 'icon', type: 'image/svg+xml', href: `${base}logo.svg` }],
    ['link', { rel: 'apple-touch-icon', sizes: '180x180', href: `${base}apple-touch-icon.png` }],
    ['meta', { name: 'theme-color', content: brand }],
    ['meta', { name: 'google-site-verification', content: 'tQKWpMESb7_XYCOMCID91lFgoQ4_dt3sqGoXzuRu-ZQ' }],
    ['link', { rel: 'alternate', type: 'text/plain', title: 'llms.txt', href: `${base}llms.txt` }],
  ],
  sitemap: {
    // VitePress 1.6 builds item URLs without `base`, so the hostname carries it.
    hostname: site,
    transformItems: (items) =>
      items.map((item) => {
        const en = item.links?.find((l) => l.lang === seoLocales.root.lang);
        return en ? { ...item, links: [...item.links!, { lang: 'x-default', url: en.url }] } : item;
      }),
  },
  transformHead({ page, pageData, siteConfig, title, description }) {
    if (page === '404.md' || pageData.isNotFound) {
      return [['meta', { name: 'robots', content: 'noindex' }]];
    }
    const locale = localeOf(page);
    const key = locale === 'root' ? page : page.slice(locale.length + 1);
    const url = site + pageUrl(page);
    const exists = new Set(siteConfig.pages);
    const variants = (Object.keys(seoLocales) as SeoLocale[]).filter((l) => exists.has(seoLocales[l].prefix + key));
    const isHome = pageData.frontmatter.layout === 'home';
    const image = `${site}og.png`;
    const imageAlt = seoLocales[locale].imageAlt;

    const head: HeadConfig[] = [['link', { rel: 'canonical', href: url }]];
    if (variants.length > 1) {
      for (const l of variants) {
        head.push([
          'link',
          { rel: 'alternate', hreflang: seoLocales[l].lang, href: site + pageUrl(seoLocales[l].prefix + key) },
        ]);
      }
      if (variants.includes('root')) {
        head.push(['link', { rel: 'alternate', hreflang: 'x-default', href: site + pageUrl(key) }]);
      }
    }
    const og: [string, string][] = [
      ['og:type', isHome ? 'website' : 'article'],
      ['og:site_name', 'LoaderKit'],
      ['og:title', title],
      ['og:description', description],
      ['og:url', url],
      ['og:locale', seoLocales[locale].og],
      ...variants
        .filter((l) => l !== locale)
        .map((l): [string, string] => ['og:locale:alternate', seoLocales[l].og]),
      ['og:image', image],
      ['og:image:type', 'image/png'],
      ['og:image:width', '1200'],
      ['og:image:height', '630'],
      ['og:image:alt', imageAlt],
    ];
    for (const [property, content] of og) head.push(['meta', { property, content }]);
    const twitter: [string, string][] = [
      ['twitter:card', 'summary_large_image'],
      ['twitter:title', title],
      ['twitter:description', description],
      ['twitter:image', image],
      ['twitter:image:alt', imageAlt],
    ];
    for (const [name, content] of twitter) head.push(['meta', { name, content }]);
    if (isHome) {
      head.push(['script', { type: 'application/ld+json' }, JSON.stringify(jsonLd(seoLocales[locale].lang, description))]);
    }
    return head;
  },
  vite: {
    resolve: {
      // The docs run the TypeScript sources of the packages, so no package build is needed first.
      alias: [
        { find: /^@loader-kit\/spec$/, replacement: root('spec/src/index.ts') },
        { find: /^@loader-kit\/web\/element$/, replacement: root('web/src/element.ts') },
        { find: /^@loader-kit\/web$/, replacement: root('web/src/index.ts') },
      ],
    },
    build: { chunkSizeWarningLimit: 1200 },
  },
  locales: {
    root: {
      label: 'English',
      lang: 'en-US',
      themeConfig: themeConfig('', en),
    },
    vi: {
      label: 'Tiếng Việt',
      lang: 'vi-VN',
      title: 'LoaderKit',
      description:
        'Loading indicator mô tả bằng JSON, render native trên Android, iOS, macOS, Windows và web từ cùng một spec.',
      themeConfig: {
        ...themeConfig('/vi', vi),
        outline: { level: [2, 3], label: 'Trên trang này' },
        docFooter: { prev: 'Trang trước', next: 'Trang sau' },
        lastUpdated: { text: 'Cập nhật lần cuối' },
        editLink: {
          pattern: ({ filePath }) =>
            filePath.endsWith('spec/reference.md')
              ? 'https://github.com/maitrungduc1410/loader-kit/edit/master/SPEC.md'
              : `https://github.com/maitrungduc1410/loader-kit/edit/master/docs/${filePath}`,
          text: 'Sửa trang này trên GitHub',
        },
        returnToTopLabel: 'Về đầu trang',
        sidebarMenuLabel: 'Menu',
        darkModeSwitchLabel: 'Giao diện',
        lightModeSwitchTitle: 'Chuyển sang giao diện sáng',
        darkModeSwitchTitle: 'Chuyển sang giao diện tối',
        langMenuLabel: 'Đổi ngôn ngữ',
        skipToContentLabel: 'Chuyển đến nội dung',
        notFound: {
          title: 'KHÔNG TÌM THẤY TRANG',
          quote: 'Trang bạn tìm không tồn tại hoặc đã được chuyển đi.',
          linkLabel: 'Về trang chủ',
          linkText: 'Về trang chủ',
        },
        footer: { message: 'Phát hành theo giấy phép MIT.', copyright: 'Copyright © Duc Trung Mai' },
      },
    },
    zh: {
      label: '简体中文',
      lang: 'zh-CN',
      title: 'LoaderKit',
      description: '用 JSON 描述加载动画，在 Android、iOS、macOS、Windows 和 Web 上原生渲染。',
      themeConfig: {
        ...themeConfig('/zh', zh),
        outline: { level: [2, 3], label: '页面导航' },
        docFooter: { prev: '上一页', next: '下一页' },
        lastUpdated: { text: '最后更新于' },
        editLink: {
          pattern: ({ filePath }) =>
            filePath.endsWith('spec/reference.md')
              ? 'https://github.com/maitrungduc1410/loader-kit/edit/master/SPEC.md'
              : `https://github.com/maitrungduc1410/loader-kit/edit/master/docs/${filePath}`,
          text: '在 GitHub 上编辑此页',
        },
        returnToTopLabel: '回到顶部',
        sidebarMenuLabel: '菜单',
        darkModeSwitchLabel: '外观',
        lightModeSwitchTitle: '切换到浅色模式',
        darkModeSwitchTitle: '切换到深色模式',
        langMenuLabel: '切换语言',
        skipToContentLabel: '跳到正文',
        notFound: {
          title: '页面未找到',
          quote: '你访问的页面不存在或已被移动。',
          linkLabel: '返回首页',
          linkText: '返回首页',
        },
        footer: { message: '基于 MIT 许可证发布。', copyright: 'Copyright © Duc Trung Mai' },
      },
    },
  },
  themeConfig: {
    logo: { src: '/logo.svg', alt: '' },
    socialLinks: [{ icon: 'github', link: repo, ariaLabel: 'GitHub' }],
    search: {
      provider: 'local',
      options: {
        locales: {
          vi: {
            translations: {
              button: { buttonText: 'Tìm kiếm', buttonAriaLabel: 'Tìm kiếm' },
              modal: {
                displayDetails: 'Hiển thị chi tiết',
                resetButtonTitle: 'Xóa tìm kiếm',
                backButtonTitle: 'Đóng tìm kiếm',
                noResultsText: 'Không có kết quả cho',
                footer: { selectText: 'chọn', navigateText: 'di chuyển', closeText: 'đóng' },
              },
            },
          },
          zh: {
            translations: {
              button: { buttonText: '搜索', buttonAriaLabel: '搜索' },
              modal: {
                displayDetails: '显示详情',
                resetButtonTitle: '清除查询',
                backButtonTitle: '关闭搜索',
                noResultsText: '没有找到相关结果',
                footer: { selectText: '选择', navigateText: '切换', closeText: '关闭' },
              },
            },
          },
        },
      },
    },
    editLink: {
      // Serialized into the client bundle, so it cannot use variables from this file. The spec
      // reference page includes SPEC.md from the repository root.
      pattern: ({ filePath }) =>
        filePath.endsWith('spec/reference.md')
          ? 'https://github.com/maitrungduc1410/loader-kit/edit/master/SPEC.md'
          : `https://github.com/maitrungduc1410/loader-kit/edit/master/docs/${filePath}`,
      text: 'Edit this page on GitHub',
    },
    outline: { level: [2, 3] },
    footer: { message: 'Released under the MIT License.', copyright: 'Copyright © Duc Trung Mai' },
  },
});
