import React from 'react';
import { useStore } from './test';

const CefTest2: React.FC = () => {
  const {bears, increasePopulation, removeAllBears, updateBears} = useStore(state => state)
  return (
    <div className="p-4  rounded shadow-lg">
      <h1 className="text-2xl font-bold">Cef Test 2</h1>
      <p className="text-lg">Bears: {bears}</p>
      <button onClick={increasePopulation} className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded">Increase Population</button>
      <button onClick={removeAllBears} className="bg-red-500 hover:bg-red-700 text-white font-bold py-2 px-4 rounded">Remove All Bears</button>
      <button onClick={() => updateBears(10)} className="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded">Update Bears to 10</button>
    </div>
  );
};

export default CefTest2;