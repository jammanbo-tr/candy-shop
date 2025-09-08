import { Loader } from '@googlemaps/js-api-loader';

let googleMapsInstance = null;
let loaderPromise = null;

export const getGoogleMaps = async () => {
  if (googleMapsInstance) {
    return googleMapsInstance;
  }

  if (loaderPromise) {
    return await loaderPromise;
  }

  const loader = new Loader({
    apiKey: 'AIzaSyD9q64HTN-tWQ9v8I0PdDL3Sq48kWSHRyA',
    version: 'weekly',
    libraries: ['places', 'visualization']
  });

  loaderPromise = loader.load();
  googleMapsInstance = await loaderPromise;
  
  return googleMapsInstance;
};

export const resetGoogleMaps = () => {
  googleMapsInstance = null;
  loaderPromise = null;
}; 