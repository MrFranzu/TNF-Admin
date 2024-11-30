import React, { useState, useEffect } from "react";
import { db } from "../../firebaseConfig"; // Firebase config import
import { collection, addDoc, updateDoc, deleteDoc, doc, getDocs } from "firebase/firestore";
import * as XLSX from "xlsx"; // Import xlsx library
import { saveAs } from "file-saver"; // Import file-saver for download

function EventSupplies() {
  const [supplies, setSupplies] = useState([]);
  const [newSupply, setNewSupply] = useState("");
  const [newQuantity, setNewQuantity] = useState("");
  const [editIndex, setEditIndex] = useState(null);
  const [editId, setEditId] = useState(null);

  const suppliesCollectionRef = collection(db, "supplies");

  useEffect(() => {
    const fetchSupplies = async () => {
      const data = await getDocs(suppliesCollectionRef);
      setSupplies(data.docs.map((doc) => ({ ...doc.data(), id: doc.id })));
    };
    fetchSupplies();
  }, []);

  const handleAddSupply = async () => {
    if (newSupply && newQuantity) {
      try {
        await addDoc(suppliesCollectionRef, {
          name: newSupply,
          quantity: parseInt(newQuantity, 10),
        });
        setNewSupply("");
        setNewQuantity("");
        const data = await getDocs(suppliesCollectionRef);
        setSupplies(data.docs.map((doc) => ({ ...doc.data(), id: doc.id })));
      } catch (e) {
        console.error("Error adding document: ", e);
      }
    }
  };

  const handleEditSupply = (index) => {
    setEditIndex(index);
    setNewSupply(supplies[index].name);
    setNewQuantity(supplies[index].quantity);
    setEditId(supplies[index].id);
  };

  const handleUpdateSupply = async () => {
    if (newSupply && newQuantity && editIndex !== null) {
      try {
        const supplyDoc = doc(db, "supplies", editId);
        await updateDoc(supplyDoc, {
          name: newSupply,
          quantity: parseInt(newQuantity, 10),
        });
        setNewSupply("");
        setNewQuantity("");
        setEditIndex(null);
        setEditId(null);
        const data = await getDocs(suppliesCollectionRef);
        setSupplies(data.docs.map((doc) => ({ ...doc.data(), id: doc.id })));
      } catch (e) {
        console.error("Error updating document: ", e);
      }
    }
  };

  const handleDeleteSupply = async (id) => {
    try {
      const supplyDoc = doc(db, "supplies", id);
      await deleteDoc(supplyDoc);
      const data = await getDocs(suppliesCollectionRef);
      setSupplies(data.docs.map((doc) => ({ ...doc.data(), id: doc.id })));
    } catch (e) {
      console.error("Error deleting document: ", e);
    }
  };

  const handleExportExcel = () => {
    const ws = XLSX.utils.json_to_sheet(
      supplies.map((supply) => ({
        "Supply Name": supply.name,
        Quantity: supply.quantity,
      }))
    );
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Supplies");
    const excelBuffer = XLSX.write(wb, { bookType: "xlsx", type: "array" });
    const file = new Blob([excelBuffer], { type: "application/octet-stream" });
    saveAs(file, "supplies_list.xlsx");
  };

  const containerStyle = {
    backgroundColor: "#EEE6F3",
    color: "#4A148C",
    fontFamily: "Arial, sans-serif",
    padding: "20px",
    maxWidth: "1200px",
    margin: "auto",
    borderRadius: "8px",
    textAlign: "center",
  };

  const inputStyle = {
    margin: "10px",
    padding: "8px",
    border: "1px solid #4A148C",
    borderRadius: "4px",
    outline: "none",
  };

  const buttonStyle = {
    margin: "10px",
    padding: "10px 20px",
    backgroundColor: "#4A148C",
    color: "#FFF",
    border: "none",
    borderRadius: "4px",
    cursor: "pointer",
  };

  const tableStyle = {
    width: "100%",
    borderCollapse: "collapse",
    margin: "20px 0",
  };

  const thStyle = {
    backgroundColor: "#6A1B9A",
    color: "#FFF",
    padding: "10px",
  };

  const tdStyle = {
    border: "1px solid #DDD",
    padding: "10px",
    textAlign: "center",
  };

  return (
    <div style={containerStyle}>
      <h1>Supply Management</h1>
      <div>
        <input
          type="text"
          style={inputStyle}
          value={newSupply}
          onChange={(e) => setNewSupply(e.target.value)}
          placeholder="Supply Name"
        />
        <input
          type="number"
          style={inputStyle}
          value={newQuantity}
          onChange={(e) => setNewQuantity(e.target.value)}
          placeholder="Quantity"
        />
        {editIndex !== null ? (
          <button style={buttonStyle} onClick={handleUpdateSupply}>
            Update Supply
          </button>
        ) : (
          <button style={buttonStyle} onClick={handleAddSupply}>
            Add Supply
          </button>
        )}
      </div>


      <table style={tableStyle}>
        <thead>
          <tr>
            <th style={thStyle}>Supply Name</th>
            <th style={thStyle}>Quantity</th>
            <th style={thStyle}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {supplies.map((supply, index) => (
            <tr key={supply.id}>
              <td style={tdStyle}>{supply.name}</td>
              <td style={tdStyle}>{supply.quantity}</td>
              <td style={tdStyle}>
                <button style={buttonStyle} onClick={() => handleEditSupply(index)}>
                  Edit
                </button>
                <button style={buttonStyle} onClick={() => handleDeleteSupply(supply.id)}>
                  Delete
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <button style={buttonStyle} onClick={handleExportExcel}>
        Export to Excel
      </button>
    </div>
  );
}

export default EventSupplies;
