// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title AyoobHaroon_supplychain
 * @author Ayoob Haroon (20I-0777)
 * @notice Supply Chain Management Smart Contract for tracking products
 */
contract AyoobHaroon_supplychain {
    
    // Student Information
    string public constant STUDENT_NAME = "Ayoob Haroon";
    string public constant ROLL_NO = "20I-0777";
    
    // Enums
    enum Role { NONE, MANUFACTURER, DISTRIBUTOR, RETAILER, CUSTOMER }
    enum Status { MANUFACTURED, IN_TRANSIT_TO_DISTRIBUTOR, WITH_DISTRIBUTOR, 
                  IN_TRANSIT_TO_RETAILER, WITH_RETAILER, 
                  IN_TRANSIT_TO_CUSTOMER, DELIVERED }
    
    // Structs
    struct Product {
        uint256 id;
        string name;
        string description;
        address currentOwner;
        Status status;
        uint256 timestamp;
        bool exists;
    }
    
    struct User {
        address userAddress;
        Role role;
        string name;
        bool isRegistered;
    }
    
    struct ProductHistory {
        address owner;
        Status status;
        uint256 timestamp;
    }
    
    // State Variables
    address public admin;
    uint256 public productCounter;
    
    // Mappings
    mapping(address => User) public users;
    mapping(uint256 => Product) public products;
    mapping(uint256 => ProductHistory[]) public productHistory;
    
    // Events
    event UserRegistered(address indexed userAddress, Role role, string name);
    event ProductRegistered(uint256 indexed productId, string name, address manufacturer);
    event ProductTransferred(uint256 indexed productId, address from, address to, Status newStatus);
    event StatusUpdated(uint256 indexed productId, Status newStatus);
    
    // Modifiers
    modifier onlyAdmin() {
        require(msg.sender == admin, "Only admin can perform this action");
        _;
    }
    
    modifier onlyRole(Role _role) {
        require(users[msg.sender].role == _role, "Unauthorized role");
        _;
    }
    
    modifier productExists(uint256 _productId) {
        require(products[_productId].exists, "Product does not exist");
        _;
    }
    
    modifier onlyProductOwner(uint256 _productId) {
        require(products[_productId].currentOwner == msg.sender, "Not the product owner");
        _;
    }
    
    constructor() {
        admin = msg.sender;
        // Register admin as manufacturer by default
        users[admin] = User({
            userAddress: admin,
            role: Role.MANUFACTURER,
            name: "Admin Manufacturer",
            isRegistered: true
        });
    }
    
    // User Management Functions
    function registerUser(address _userAddress, Role _role, string memory _name) public onlyAdmin {
        require(_role != Role.NONE, "Invalid role");
        require(!users[_userAddress].isRegistered, "User already registered");
        
        users[_userAddress] = User({
            userAddress: _userAddress,
            role: _role,
            name: _name,
            isRegistered: true
        });
        
        emit UserRegistered(_userAddress, _role, _name);
    }
    
    function getUser(address _userAddress) public view returns (
        address userAddress,
        Role role,
        string memory name,
        bool isRegistered
    ) {
        User memory user = users[_userAddress];
        return (user.userAddress, user.role, user.name, user.isRegistered);
    }
    
    // Product Management Functions
    function registerProduct(
        string memory _name,
        string memory _description
    ) public onlyRole(Role.MANUFACTURER) returns (uint256) {
        productCounter++;
        uint256 newProductId = productCounter;
        
        products[newProductId] = Product({
            id: newProductId,
            name: _name,
            description: _description,
            currentOwner: msg.sender,
            status: Status.MANUFACTURED,
            timestamp: block.timestamp,
            exists: true
        });
        
        // Add to history
        productHistory[newProductId].push(ProductHistory({
            owner: msg.sender,
            status: Status.MANUFACTURED,
            timestamp: block.timestamp
        }));
        
        emit ProductRegistered(newProductId, _name, msg.sender);
        
        return newProductId;
    }
    
    function transferToDistributor(uint256 _productId, address _distributor) 
        public 
        onlyRole(Role.MANUFACTURER)
        productExists(_productId)
        onlyProductOwner(_productId)
    {
        require(users[_distributor].role == Role.DISTRIBUTOR, "Recipient must be a distributor");
        
        _transferProduct(_productId, _distributor, Status.IN_TRANSIT_TO_DISTRIBUTOR);
    }
    
    function receiveByDistributor(uint256 _productId)
        public
        onlyRole(Role.DISTRIBUTOR)
        productExists(_productId)
    {
        require(products[_productId].status == Status.IN_TRANSIT_TO_DISTRIBUTOR, "Invalid status");
        
        products[_productId].currentOwner = msg.sender;
        products[_productId].status = Status.WITH_DISTRIBUTOR;
        products[_productId].timestamp = block.timestamp;
        
        productHistory[_productId].push(ProductHistory({
            owner: msg.sender,
            status: Status.WITH_DISTRIBUTOR,
            timestamp: block.timestamp
        }));
        
        emit StatusUpdated(_productId, Status.WITH_DISTRIBUTOR);
    }
    
    function transferToRetailer(uint256 _productId, address _retailer)
        public
        onlyRole(Role.DISTRIBUTOR)
        productExists(_productId)
        onlyProductOwner(_productId)
    {
        require(users[_retailer].role == Role.RETAILER, "Recipient must be a retailer");
        
        _transferProduct(_productId, _retailer, Status.IN_TRANSIT_TO_RETAILER);
    }
    
    function receiveByRetailer(uint256 _productId)
        public
        onlyRole(Role.RETAILER)
        productExists(_productId)
    {
        require(products[_productId].status == Status.IN_TRANSIT_TO_RETAILER, "Invalid status");
        
        products[_productId].currentOwner = msg.sender;
        products[_productId].status = Status.WITH_RETAILER;
        products[_productId].timestamp = block.timestamp;
        
        productHistory[_productId].push(ProductHistory({
            owner: msg.sender,
            status: Status.WITH_RETAILER,
            timestamp: block.timestamp
        }));
        
        emit StatusUpdated(_productId, Status.WITH_RETAILER);
    }
    
    function transferToCustomer(uint256 _productId, address _customer)
        public
        onlyRole(Role.RETAILER)
        productExists(_productId)
        onlyProductOwner(_productId)
    {
        require(users[_customer].role == Role.CUSTOMER, "Recipient must be a customer");
        
        _transferProduct(_productId, _customer, Status.IN_TRANSIT_TO_CUSTOMER);
    }
    
    function receiveByCustomer(uint256 _productId)
        public
        onlyRole(Role.CUSTOMER)
        productExists(_productId)
    {
        require(products[_productId].status == Status.IN_TRANSIT_TO_CUSTOMER, "Invalid status");
        
        products[_productId].currentOwner = msg.sender;
        products[_productId].status = Status.DELIVERED;
        products[_productId].timestamp = block.timestamp;
        
        productHistory[_productId].push(ProductHistory({
            owner: msg.sender,
            status: Status.DELIVERED,
            timestamp: block.timestamp
        }));
        
        emit StatusUpdated(_productId, Status.DELIVERED);
    }
    
    // Internal Functions
    function _transferProduct(uint256 _productId, address _to, Status _newStatus) internal {
        address previousOwner = products[_productId].currentOwner;
        
        products[_productId].status = _newStatus;
        products[_productId].timestamp = block.timestamp;
        
        productHistory[_productId].push(ProductHistory({
            owner: previousOwner,
            status: _newStatus,
            timestamp: block.timestamp
        }));
        
        emit ProductTransferred(_productId, previousOwner, _to, _newStatus);
    }
    
    // View Functions
    function getProduct(uint256 _productId) public view productExists(_productId) returns (
        uint256 id,
        string memory name,
        string memory description,
        address currentOwner,
        Status status,
        uint256 timestamp
    ) {
        Product memory product = products[_productId];
        return (
            product.id,
            product.name,
            product.description,
            product.currentOwner,
            product.status,
            product.timestamp
        );
    }
    
    function getProductHistory(uint256 _productId) 
        public 
        view 
        productExists(_productId) 
        returns (ProductHistory[] memory) 
    {
        return productHistory[_productId];
    }
    
    function getProductCount() public view returns (uint256) {
        return productCounter;
    }
    
    function getStatusString(Status _status) public pure returns (string memory) {
        if (_status == Status.MANUFACTURED) return "Manufactured";
        if (_status == Status.IN_TRANSIT_TO_DISTRIBUTOR) return "In Transit to Distributor";
        if (_status == Status.WITH_DISTRIBUTOR) return "With Distributor";
        if (_status == Status.IN_TRANSIT_TO_RETAILER) return "In Transit to Retailer";
        if (_status == Status.WITH_RETAILER) return "With Retailer";
        if (_status == Status.IN_TRANSIT_TO_CUSTOMER) return "In Transit to Customer";
        if (_status == Status.DELIVERED) return "Delivered";
        return "Unknown";
    }
    
    function getRoleString(Role _role) public pure returns (string memory) {
        if (_role == Role.MANUFACTURER) return "Manufacturer";
        if (_role == Role.DISTRIBUTOR) return "Distributor";
        if (_role == Role.RETAILER) return "Retailer";
        if (_role == Role.CUSTOMER) return "Customer";
        return "None";
    }
}