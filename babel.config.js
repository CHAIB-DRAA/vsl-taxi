module.exports = function(api) {
    api.cache(true);
    return {
      presets: ['babel-preset-expo'],
      plugins: [
        'react-native-reanimated/plugin', // 👈 C'est cette ligne qui empêche le crash
      ],
    };
  };