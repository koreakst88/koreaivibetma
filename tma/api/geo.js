module.exports = (req, res) => {
    const country = String(req.headers['x-vercel-ip-country'] || '').toUpperCase().trim();

    const pricingRegionMap = {
        RU: 'RU',
        KZ: 'KZ',
        KR: 'KR'
    };

    const pricingRegion = pricingRegionMap[country] || 'DEFAULT';

    res.setHeader('Cache-Control', 'no-store');
    res.status(200).json({
        country: country || null,
        pricingRegion
    });
};
