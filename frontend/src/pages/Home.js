import React, { useEffect, useState } from 'react';
import axios from 'axios';
import ProductMap from '../components/ProductMap';
import PropTypes from 'prop-types';

const center = {
  lat: 37.7749,
  lng: -122.4194
};

function Home() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axios.get(`${process.env.REACT_APP_BACKEND_URL}/api/products`)
      .then(res => {
        setProducts(res.data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  return (
    <div>
      <ProductMap center={center} products={products} />
      <h2 className="mt-4">Products</h2>
      {loading ? <div>Loading...</div> : (
        <ul className="list-group">
          {products.map(product => (
            <li key={product._id} className="list-group-item">
              <strong>{product.name}</strong> - ${product.price} <br />
              {product.description}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default Home; 