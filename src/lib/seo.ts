export type SeoProps = {
    title?: string;
    description?: string;
    keywords?: string[];
    image?: string;
    url?: string;
    type?: string;
};
type SeoData = {
    title?: string;
    description?: string;
};

export function updateSeo(data: SeoData) {
    if (typeof document !== 'undefined') {
        if (data.title) document.title = data.title;
        if (data.description) {
            const metaDescription = document.querySelector('meta[name="description"]');
            if (metaDescription) {
                metaDescription.setAttribute('content', data.description);
            } else {
                const meta = document.createElement('meta');
                meta.name = 'description';
                meta.content = data.description;
                document.head.appendChild(meta);
            }
        }
    }
}
export const DEFAULT_SEO: SeoProps = {
    title: 'DrawAudio - Interactive Musical Sequencer',
    description: 'Create music by drawing patterns on an interactive grid. DrawAudio is a visual music sequencer built with Svelte and Web Audio API.',
    keywords: [
        'music sequencer',
        'audio visualization',
        'web audio api',
        'interactive music',
        'music grid',
        'music maker',
        'svelte audio',
        'sound design',
        'draw music',
        'browser sequencer'
    ],
    image: '/og-image.png',
    url: 'https://drawaudio.zxce3.net',
    type: 'website'
};

export function generateSeoTags(customSeo?: Partial<SeoProps>): SeoProps {
    return {
        ...DEFAULT_SEO,
        ...customSeo
    };
}
