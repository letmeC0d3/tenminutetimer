/**
 * scripts/generate-sitemap.js
 * Automatically generates a production-ready sitemap.xml with accurate
 * <lastmod>, <changefreq>, <priority>, and bidirectional hreflang alternate tags
 * for English (root) and localized subdirectories (/de/, /es/, /fr/, /it/, /pt/).
 */

const fs = require('fs');
const path = require('path');

const BASE_URL = 'https://tenminutetimer.com';
const languages = ['', 'de', 'es', 'fr', 'it', 'pt'];

const pages = [
  { slug: '', priority: '1.0', changefreq: 'weekly' },
  { slug: '5-minute-timer.html', priority: '0.9', changefreq: 'weekly' },
  { slug: '15-minute-timer.html', priority: '0.9', changefreq: 'weekly' },
  { slug: '20-minute-timer.html', priority: '0.9', changefreq: 'weekly' },
  { slug: '25-minute-timer.html', priority: '0.9', changefreq: 'weekly' },
  { slug: '30-minute-timer.html', priority: '0.9', changefreq: 'weekly' },
  { slug: 'cat-timer.html', priority: '0.9', changefreq: 'weekly' },
  { slug: 'about.html', priority: '0.5', changefreq: 'monthly' },
  { slug: 'contact.html', priority: '0.4', changefreq: 'monthly' },
  { slug: 'privacy.html', priority: '0.3', changefreq: 'yearly' },
  { slug: 'terms.html', priority: '0.3', changefreq: 'yearly' }
];

const today = new Date().toISOString().split('T')[0];

function generateSitemap() {
  let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
  xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"\n';
  xml += '        xmlns:xhtml="http://www.w3.org/1999/xhtml">\n';

  languages.forEach((lang) => {
    pages.forEach((page) => {
      const langPrefix = lang ? `/${lang}` : '';
      let pagePath = page.slug ? `/${page.slug}` : '/';
      
      // Construct canonical location
      const loc = `${BASE_URL}${langPrefix}${pagePath === '/' && langPrefix ? '/' : pagePath}`;

      xml += '  <url>\n';
      xml += `    <loc>${loc}</loc>\n`;
      xml += `    <lastmod>${today}</lastmod>\n`;
      xml += `    <changefreq>${page.changefreq}</changefreq>\n`;
      xml += `    <priority>${page.priority}</priority>\n`;

      // Bidirectional hreflang links
      // x-default points to English root/default
      const defaultUrl = `${BASE_URL}${pagePath}`;
      xml += `    <xhtml:link rel="alternate" hreflang="x-default" href="${defaultUrl}" />\n`;
      xml += `    <xhtml:link rel="alternate" hreflang="en" href="${defaultUrl}" />\n`;

      languages.filter(l => l !== '').forEach((otherLang) => {
        const altLoc = `${BASE_URL}/${otherLang}${pagePath === '/' ? '/' : pagePath}`;
        xml += `    <xhtml:link rel="alternate" hreflang="${otherLang}" href="${altLoc}" />\n`;
      });

      xml += '  </url>\n';
    });
  });

  xml += '</urlset>\n';

  const outputPath = path.join(__dirname, '..', 'sitemap.xml');
  fs.writeFileSync(outputPath, xml, 'utf8');
  console.log(`✅ Successfully generated sitemap.xml at ${outputPath}`);
}

generateSitemap();
