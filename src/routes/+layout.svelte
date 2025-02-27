<script lang="ts">
	import '../app.css';
	import { DEFAULT_SEO, generateSeoTags, type SeoProps } from '$lib/seo';
	
	let { children } = $props();
	
	let seo: SeoProps = $state(DEFAULT_SEO);
	
	function updateSeo(pageSeo: Partial<SeoProps>) {
		seo = generateSeoTags(pageSeo);
	}
	
	// Make updateSeo available to child routes
	let _ = $derived(updateSeo);
</script>

<svelte:head>
	<title>{seo.title}</title>
	<meta name="description" content={seo.description} />
	{#if seo.keywords && seo.keywords.length > 0}
		<meta name="keywords" content={seo.keywords.join(', ')} />
	{/if}
	
	<!-- Open Graph / Facebook -->
	<meta property="og:type" content={seo.type} />
	<meta property="og:url" content={seo.url} />
	<meta property="og:title" content={seo.title} />
	<meta property="og:description" content={seo.description} />
	{#if seo.image}
		<meta property="og:image" content={seo.image} />
	{/if}
	
	<!-- Twitter -->
	<meta property="twitter:card" content="summary_large_image" />
	<meta property="twitter:url" content={seo.url} />
	<meta property="twitter:title" content={seo.title} />
	<meta property="twitter:description" content={seo.description} />
	{#if seo.image}
		<meta property="twitter:image" content={seo.image} />
	{/if}
	
	<!-- Canonical URL -->
	<link rel="canonical" href={seo.url} />
</svelte:head>

{@render children()}
