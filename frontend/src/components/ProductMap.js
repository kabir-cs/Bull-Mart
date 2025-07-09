import React from 'react';
import { GoogleMap, Marker } from '@react-google-maps/api';
import PropTypes from 'prop-types';

const containerStyle = {
  width: '100%',
  height: '400px'
};

function ProductMap({ center, products }) {
  return (
    <GoogleMap
      mapContainerStyle={containerStyle}
      center={center}
      zoom={10}
    >
      {products.map((product) => (
        <Marker
          key={product._id}
          position={{ lat: product.location.lat, lng: product.location.lng }}
          title={product.name}
        />
      ))}
    </GoogleMap>
  );
}

ProductMap.propTypes = {
  center: PropTypes.object.isRequired,
  products: PropTypes.array.isRequired,
};

export default ProductMap; 