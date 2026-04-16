module.exports = (req, res) => {
    const country = String(req.headers['x-vercel-ip-country'] || '').toUpperCase().trim();

    const pricingRegionMap = {
        RU: 'RU',
        KZ: 'KZ',
        KR: 'KR'
    };

    const pricingRegion = pricingRegionMap[country] || 'DEFAULT';

    res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate=86400');
    res.status(200).json({
        country: country || null,
        pricingRegion
    });
};
