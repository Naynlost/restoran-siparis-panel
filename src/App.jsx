import { useState, useEffect } from 'react';
import { Container, Row, Col, Navbar, Card, Button, ListGroup, Badge, Modal, Form, Alert } from 'react-bootstrap';
import { collection, getDocs, addDoc, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import { db } from './firebase'; 
import { FaPlus, FaTrash, FaEdit, FaShoppingCart } from 'react-icons/fa';

function App() {
  const [menuItems, setMenuItems] = useState([]);
  const [cart, setCart] = useState([]);

  // Modallar ve Bildirim State'leri
  const [showAddModal, setShowAddModal] = useState(false);
  const [newItemName, setNewItemName] = useState('');
  const [newItemPrice, setNewItemPrice] = useState('');

  const [showPriceModal, setShowPriceModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [editPrice, setEditPrice] = useState('');

  // Sipariş Onay Modalı State'i
  const [showCheckoutModal, setShowCheckoutModal] = useState(false);
  const [checkoutMessage, setCheckoutMessage] = useState('');

  // 1. Verileri Çekme
  const fetchMenu = async () => {
    const querySnapshot = await getDocs(collection(db, "menu"));
    const items = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    setMenuItems(items);
  };

  useEffect(() => {
    fetchMenu();
  }, []);

  // 2. Ürün Ekleme
  const handleAddProduct = async (e) => {
    e.preventDefault();
    if (!newItemName || !newItemPrice) return;
    await addDoc(collection(db, "menu"), { name: newItemName, price: Number(newItemPrice) });
    setNewItemName('');
    setNewItemPrice('');
    setShowAddModal(false);
    fetchMenu(); 
  };

  // 3. Ürün Silme (Onaylı)
  const handleDeleteProduct = async (id) => {
    const isConfirmed = window.confirm("Bu ürünü silmek istediğinize emin misiniz?");
    if (isConfirmed) {
      await deleteDoc(doc(db, "menu", id));
      fetchMenu();
    }
  };

  // 4. Fiyat Güncelleme
  const openPriceModal = (item) => {
    setEditingItem(item);
    setEditPrice(item.price);
    setShowPriceModal(true);
  };

  const submitPriceUpdate = async (e) => {
    e.preventDefault();
    if (editPrice && !isNaN(editPrice)) {
      await updateDoc(doc(db, "menu", editingItem.id), { price: Number(editPrice) });
      setShowPriceModal(false);
      fetchMenu();
    }
  };

  // --- Sepet Fonksiyonları ---
  const addToCart = (item) => {
    const existingItem = cart.find(c => c.id === item.id);
    if (existingItem) {
      setCart(cart.map(c => c.id === item.id ? { ...c, quantity: c.quantity + 1 } : c));
    } else {
      setCart([...cart, { ...item, quantity: 1 }]);
    }
  };

  const removeFromCart = (itemId) => {
    const existingItem = cart.find(c => c.id === itemId);
    if (existingItem.quantity === 1) {
      setCart(cart.filter(c => c.id !== itemId));
    } else {
      setCart(cart.map(c => c.id === itemId ? { ...c, quantity: c.quantity - 1 } : c));
    }
  };

  const totalAmount = cart.reduce((total, cartItem) => {
    const currentItem = menuItems.find(m => m.id === cartItem.id);
    const price = currentItem ? currentItem.price : 0;
    return total + (price * cartItem.quantity);
  }, 0);

  // Ödemeyi Kesinleştirme
  const handleConfirmCheckout = () => {
    setCheckoutMessage(`Toplam ${totalAmount} TL ödeme başarıyla alındı. Sipariş hazırlanıyor.`);
    setCart([]);
    setShowCheckoutModal(false);
    setTimeout(() => setCheckoutMessage(''), 4000); 
  };

  return (
    <>
      <Navbar bg="dark" variant="dark" className="mb-4 shadow-sm">
        <Container>
          <Navbar.Brand className="d-flex align-items-center gap-2">
            <FaShoppingCart /> Restoran Sipariş Paneli
          </Navbar.Brand>
        </Container>
      </Navbar>

      <Container>
        <Row>
          {/* Sol Taraf: Menü */}
          <Col md={8}>
            <div className="d-flex justify-content-between align-items-center mb-3">
              <h4 className="m-0">Menü</h4>
              <Button variant="success" size="sm" className="d-flex align-items-center gap-1" onClick={() => setShowAddModal(true)}>
                <FaPlus /> Yeni Ekle
              </Button>
            </div>
            
            <Row>
              {menuItems.length === 0 ? <p className="text-muted">Menü boş. Lütfen yeni ürün ekleyin.</p> : null}
              {menuItems.map((item) => (
                <Col md={6} key={item.id} className="mb-3">
                  <Card className="shadow-sm border-0 h-100">
                    <Card.Body>
                      <div className="d-flex justify-content-between align-items-center mb-3">
                        <div>
                          <Card.Title className="mb-1">{item.name}</Card.Title>
                          <Card.Text className="text-success fw-bold mb-0">{item.price} TL</Card.Text>
                        </div>
                        <Button variant="primary" size="sm" onClick={() => addToCart(item)}>Sepete Ekle</Button>
                      </div>
                      <div className="d-flex justify-content-end gap-2 border-top pt-2">
                         <Button variant="outline-secondary" size="sm" onClick={() => openPriceModal(item)}>
                           <FaEdit className="me-1" /> Fiyat Düzenle
                         </Button>
                         <Button variant="outline-danger" size="sm" onClick={() => handleDeleteProduct(item.id)}>
                           <FaTrash className="me-1" /> Sil
                         </Button>
                      </div>
                    </Card.Body>
                  </Card>
                </Col>
              ))}
            </Row>
          </Col>

          {/* Sağ Taraf: Sipariş */}
          <Col md={4}>
            <h4 className="mb-3">Siparişiniz</h4>
            <div className="border border-0 shadow-sm p-3 bg-white rounded">
              {checkoutMessage && <Alert variant="success" className="p-2 text-center">{checkoutMessage}</Alert>}
              
              {cart.length === 0 ? (
                <p className="text-muted text-center my-4">Sepetiniz şu an boş.</p>
              ) : (
                <ListGroup variant="flush" className="mb-3">
                  {cart.map(cartItem => {
                    const currentItem = menuItems.find(m => m.id === cartItem.id);
                    if (!currentItem) return null; 

                    return (
                      <ListGroup.Item key={cartItem.id} className="d-flex justify-content-between align-items-center px-0">
                        <div>
                          {currentItem.name} <Badge bg="secondary" className="ms-1">x{cartItem.quantity}</Badge>
                        </div>
                        <div className="d-flex align-items-center gap-2">
                          <span className="fw-bold">{currentItem.price * cartItem.quantity} TL</span>
                          <Button variant="danger" size="sm" className="px-2 py-0" onClick={() => removeFromCart(currentItem.id)}>-</Button>
                          <Button variant="success" size="sm" className="px-2 py-0" onClick={() => addToCart(currentItem)}>+</Button>
                        </div>
                      </ListGroup.Item>
                    );
                  })}
                </ListGroup>
              )}
              <hr />
              <div className="d-flex justify-content-between fw-bold fs-5 mb-3">
                <span>Toplam:</span>
                <span className="text-primary">{totalAmount} TL</span>
              </div>
              <Button 
                variant="primary" 
                size="lg"
                className="w-100 d-flex align-items-center justify-content-center gap-2" 
                disabled={cart.length === 0}
                onClick={() => setShowCheckoutModal(true)}
              >
                Ödemeyi Al
              </Button>
            </div>
          </Col>
        </Row>
      </Container>

      {/* Ürün Ekleme Modalı */}
      <Modal show={showAddModal} onHide={() => setShowAddModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>Yeni Ürün Ekle</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form onSubmit={handleAddProduct}>
            <Form.Group className="mb-3">
              <Form.Label>Ürün Adı</Form.Label>
              <Form.Control type="text" value={newItemName} onChange={(e) => setNewItemName(e.target.value)} required />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Fiyat (TL)</Form.Label>
              <Form.Control type="number" value={newItemPrice} onChange={(e) => setNewItemPrice(e.target.value)} required />
            </Form.Group>
            <Button variant="success" type="submit" className="w-100">Kaydet</Button>
          </Form>
        </Modal.Body>
      </Modal>

      {/* Fiyat Güncelleme Modalı */}
      <Modal show={showPriceModal} onHide={() => setShowPriceModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>Fiyatı Güncelle: {editingItem?.name}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form onSubmit={submitPriceUpdate}>
            <Form.Group className="mb-3">
              <Form.Label>Yeni Fiyat (TL)</Form.Label>
              <Form.Control type="number" value={editPrice} onChange={(e) => setEditPrice(e.target.value)} required />
            </Form.Group>
            <Button variant="primary" type="submit" className="w-100">Fiyatı Değiştir</Button>
          </Form>
        </Modal.Body>
      </Modal>

      {/* Sipariş Onay Modalı */}
      <Modal show={showCheckoutModal} onHide={() => setShowCheckoutModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>Siparişi Onayla</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <h5 className="mb-3">Sipariş Özeti</h5>
          <ListGroup variant="flush" className="mb-3 border-bottom">
            {cart.map(cartItem => {
              const currentItem = menuItems.find(m => m.id === cartItem.id);
              if (!currentItem) return null;
              return (
                <ListGroup.Item key={cartItem.id} className="d-flex justify-content-between px-0">
                  <span>{currentItem.name} <span className="text-muted">(x{cartItem.quantity})</span></span>
                  <span>{currentItem.price * cartItem.quantity} TL</span>
                </ListGroup.Item>
              );
            })}
          </ListGroup>
          <div className="d-flex justify-content-between fw-bold fs-5 mb-4">
            <span>Genel Toplam:</span>
            <span className="text-primary">{totalAmount} TL</span>
          </div>
          <Row>
            <Col>
              <Button variant="secondary" className="w-100" onClick={() => setShowCheckoutModal(false)}>İptal</Button>
            </Col>
            <Col>
              <Button variant="success" className="w-100" onClick={handleConfirmCheckout}>Onayla ve Bitir</Button>
            </Col>
          </Row>
        </Modal.Body>
      </Modal>
    </>
  );
}

export default App;