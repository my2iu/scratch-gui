// import GoogleAnalytics from 'react-ga';

// GoogleAnalytics.initialize(process.env.GA_ID || window.GA_ID, {
    // debug: (process.env.NODE_ENV !== 'production'),
    // titleCase: true,
    // sampleRate: (process.env.NODE_ENV === 'production') ? 100 : 0,
    // forceSSL: true
// });

let DummyAnalytics = {
    event: function() { },
    pageview: function() { },
};

export default DummyAnalytics;
