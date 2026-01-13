// frontend/src/App.js
import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import './App.css';

// Import your contract ABI (generate after compilation)
import ContractABI from './AyoobHaroon_supplychain.json';
import deploymentInfo from './deployment.json';

const CONTRACT_ADDRESS = deploymentInfo.contractAddress;

function App() {
  const [account, setAccount] = useState('');
  const [contract, setContract] = useState(null);
  const [provider, setProvider] = useState(null);
  const [signer, setSigner] = useState(null);
  const [userRole, setUserRole] = useState('');
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  
  // Form states
  const [productName, setProductName] = useState('');
  const [productDesc, setProductDesc] = useState('');
  const [transferAddress, setTransferAddress] = useState('');
  const [selectedProduct, setSelectedProduct] = useState('');
  
  // Admin form states
  const [newUserAddress, setNewUserAddress] = useState('');
  const [newUserRole, setNewUserRole] = useState('1');
  const [newUserName, setNewUserName] = useState('');
  const [isAdmin, setIsAdmin] = useState(false);
  
  useEffect(() => {
    initializeWeb3();
  }, []);

  const initializeWeb3 = async () => {
    if (typeof window.ethereum !== 'undefined') {
      try {
        // Request account access
        await window.ethereum.request({ method: 'eth_requestAccounts' });
        
        const web3Provider = new ethers.BrowserProvider(window.ethereum);
        const web3Signer = await web3Provider.getSigner();
        const address = await web3Signer.getAddress();
        
        const contractInstance = new ethers.Contract(
          CONTRACT_ADDRESS,
          ContractABI.abi,
          web3Signer
        );
        
        setProvider(web3Provider);
        setSigner(web3Signer);
        setAccount(address);
        setContract(contractInstance);
        
        // Get user role
        await getUserRole(contractInstance, address);
        
        // Listen for account changes
        window.ethereum.on('accountsChanged', (accounts) => {
          window.location.reload();
        });
        
      } catch (error) {
        console.error("Error initializing Web3:", error);
        alert("Please install MetaMask!");
      }
    } else {
      alert("Please install MetaMask to use this DApp!");
    }
  };

  const getUserRole = async (contractInstance, address) => {
    try {
      const user = await contractInstance.getUser(address);
      const roleNum = Number(user.role);
      const roles = ['NONE', 'MANUFACTURER', 'DISTRIBUTOR', 'RETAILER', 'CUSTOMER'];
      setUserRole(roles[roleNum]);
      
      // Check if user is admin
      const adminAddress = await contractInstance.admin();
      setIsAdmin(address.toLowerCase() === adminAddress.toLowerCase());
    } catch (error) {
      console.error("Error getting user role:", error);
      setUserRole('NONE');
      
      // Still check if admin
      try {
        const adminAddress = await contractInstance.admin();
        setIsAdmin(address.toLowerCase() === adminAddress.toLowerCase());
      } catch (err) {
        setIsAdmin(false);
      }
    }
  };

  const registerProduct = async () => {
    if (!productName || !productDesc) {
      alert("Please fill in all fields");
      return;
    }
    
    setLoading(true);
    try {
      const tx = await contract.registerProduct(productName, productDesc);
      await tx.wait();
      alert("Product registered successfully!");
      setProductName('');
      setProductDesc('');
      await loadProducts();
    } catch (error) {
      console.error("Error registering product:", error);
      alert("Error: " + error.message);
    }
    setLoading(false);
  };

  const loadProducts = async () => {
    if (!contract) return;
    
    setLoading(true);
    try {
      const count = await contract.getProductCount();
      const productList = [];
      
      for (let i = 1; i <= count; i++) {
        try {
          const product = await contract.getProduct(i);
          productList.push({
            id: Number(product.id),
            name: product.name,
            description: product.description,
            owner: product.currentOwner,
            status: Number(product.status),
            timestamp: Number(product.timestamp)
          });
        } catch (error) {
          console.error(`Error loading product ${i}:`, error);
        }
      }
      
      setProducts(productList);
    } catch (error) {
      console.error("Error loading products:", error);
    }
    setLoading(false);
  };

  const getStatusString = (status) => {
    const statuses = [
      'Manufactured',
      'In Transit to Distributor',
      'With Distributor',
      'In Transit to Retailer',
      'With Retailer',
      'In Transit to Customer',
      'Delivered'
    ];
    return statuses[status] || 'Unknown';
  };

  const transferProduct = async () => {
    if (!selectedProduct || !transferAddress) {
      alert("Please select a product and enter recipient address");
      return;
    }
    
    setLoading(true);
    try {
      let tx;
      if (userRole === 'MANUFACTURER') {
        tx = await contract.transferToDistributor(selectedProduct, transferAddress);
      } else if (userRole === 'DISTRIBUTOR') {
        tx = await contract.transferToRetailer(selectedProduct, transferAddress);
      } else if (userRole === 'RETAILER') {
        tx = await contract.transferToCustomer(selectedProduct, transferAddress);
      }
      
      await tx.wait();
      alert("Product transferred successfully!");
      setTransferAddress('');
      await loadProducts();
    } catch (error) {
      console.error("Error transferring product:", error);
      alert("Error: " + error.message);
    }
    setLoading(false);
  };

  const receiveProduct = async (productId) => {
    setLoading(true);
    try {
      let tx;
      if (userRole === 'DISTRIBUTOR') {
        tx = await contract.receiveByDistributor(productId);
      } else if (userRole === 'RETAILER') {
        tx = await contract.receiveByRetailer(productId);
      } else if (userRole === 'CUSTOMER') {
        tx = await contract.receiveByCustomer(productId);
      }
      
      await tx.wait();
      alert("Product received successfully!");
      await loadProducts();
    } catch (error) {
      console.error("Error receiving product:", error);
      alert("Error: " + error.message);
    }
    setLoading(false);
  };

  const registerUser = async () => {
    if (!newUserAddress || !newUserName) {
      alert("Please fill in all fields");
      return;
    }
    
    setLoading(true);
    try {
      const tx = await contract.registerUser(newUserAddress, newUserRole, newUserName);
      await tx.wait();
      alert(`User registered successfully as ${['', 'Manufacturer', 'Distributor', 'Retailer', 'Customer'][newUserRole]}!`);
      setNewUserAddress('');
      setNewUserName('');
      setNewUserRole('1');
    } catch (error) {
      console.error("Error registering user:", error);
      alert("Error: " + error.message);
    }
    setLoading(false);
  };

  const viewHistory = async (productId) => {
    try {
      const history = await contract.getProductHistory(productId);
      let historyText = `Product #${productId} History:\n\n`;
      
      for (let i = 0; i < history.length; i++) {
        const entry = history[i];
        const date = new Date(Number(entry.timestamp) * 1000).toLocaleString();
        historyText += `${i + 1}. ${getStatusString(Number(entry.status))}\n`;
        historyText += `   Owner: ${entry.owner}\n`;
        historyText += `   Time: ${date}\n\n`;
      }
      
      alert(historyText);
    } catch (error) {
      console.error("Error viewing history:", error);
      alert("Error: " + error.message);
    }
  };

  return (
    <div className="App">
      <header className="App-header">
        <h1>🔗 Supply Chain Management DApp</h1>
        <div className="student-info">
          <p><strong>Ayoob Haroon</strong> | Roll No: 20I-0777</p>
        </div>
      </header>

      <div className="container">
        {/* Connection Status */}
        <div className="card">
          <h2>Connection Status</h2>
          <p><strong>Account:</strong> {account ? `${account.slice(0, 6)}...${account.slice(-4)}` : 'Not Connected'}</p>
          <p><strong>Role:</strong> {userRole}</p>
          {isAdmin && <p><strong>Admin Status:</strong> ✅ You are the Admin</p>}
          <p><strong>Network:</strong> Polygon Amoy Testnet</p>
        </div>

        {/* Admin Section - Only visible to Admin */}
        {isAdmin && (
          <div className="card admin-card">
            <h2>👑 Admin Panel - Register Users</h2>
            <p className="admin-note">Only you (the deployer) can register new users to the supply chain.</p>
            
            <input
              type="text"
              placeholder="User Wallet Address (0x...)"
              value={newUserAddress}
              onChange={(e) => setNewUserAddress(e.target.value)}
            />
            
            <input
              type="text"
              placeholder="User Name"
              value={newUserName}
              onChange={(e) => setNewUserName(e.target.value)}
            />
            
            <select 
              value={newUserRole} 
              onChange={(e) => setNewUserRole(e.target.value)}
              className="role-select"
            >
              <option value="1">Manufacturer</option>
              <option value="2">Distributor</option>
              <option value="3">Retailer</option>
              <option value="4">Customer</option>
            </select>
            
            <button onClick={registerUser} disabled={loading}>
              {loading ? 'Registering...' : 'Register User'}
            </button>
            
            <div className="admin-help">
              <p><strong>💡 How to use:</strong></p>
              <ol>
                <li>Get the wallet address from other users</li>
                <li>Enter their name and select their role</li>
                <li>Click "Register User"</li>
                <li>They can then connect with their wallet and use the DApp</li>
              </ol>
            </div>
          </div>
        )}

        {/* Manufacturer Section */}
        {userRole === 'MANUFACTURER' && (
          <div className="card">
            <h2>Register New Product</h2>
            <input
              type="text"
              placeholder="Product Name"
              value={productName}
              onChange={(e) => setProductName(e.target.value)}
            />
            <input
              type="text"
              placeholder="Product Description"
              value={productDesc}
              onChange={(e) => setProductDesc(e.target.value)}
            />
            <button onClick={registerProduct} disabled={loading}>
              {loading ? 'Processing...' : 'Register Product'}
            </button>
          </div>
        )}

        {/* Transfer Section */}
        {(userRole === 'MANUFACTURER' || userRole === 'DISTRIBUTOR' || userRole === 'RETAILER') && (
          <div className="card">
            <h2>Transfer Product</h2>
            <input
              type="number"
              placeholder="Product ID"
              value={selectedProduct}
              onChange={(e) => setSelectedProduct(e.target.value)}
            />
            <input
              type="text"
              placeholder="Recipient Address"
              value={transferAddress}
              onChange={(e) => setTransferAddress(e.target.value)}
            />
            <button onClick={transferProduct} disabled={loading}>
              {loading ? 'Processing...' : 'Transfer Product'}
            </button>
          </div>
        )}

        {/* Products List */}
        <div className="card">
          <h2>Products</h2>
          <button onClick={loadProducts} disabled={loading}>
            {loading ? 'Loading...' : 'Refresh Products'}
          </button>
          
          <div className="products-grid">
            {products.map((product) => (
              <div key={product.id} className="product-card">
                <h3>Product #{product.id}</h3>
                <p><strong>Name:</strong> {product.name}</p>
                <p><strong>Description:</strong> {product.description}</p>
                <p><strong>Status:</strong> {getStatusString(product.status)}</p>
                <p><strong>Owner:</strong> {product.owner.slice(0, 6)}...{product.owner.slice(-4)}</p>
                
                <div className="button-group">
                  <button onClick={() => viewHistory(product.id)}>
                    View History
                  </button>
                  
                  {product.owner !== account && 
                   (userRole === 'DISTRIBUTOR' || userRole === 'RETAILER' || userRole === 'CUSTOMER') && (
                    <button onClick={() => receiveProduct(product.id)}>
                      Receive Product
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <footer className="App-footer">
        <p>© 2024 Ayoob Haroon (20I-0777) | Supply Chain DApp</p>
      </footer>
    </div>
  );
}

export default App;