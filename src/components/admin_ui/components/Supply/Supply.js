import React, { useState, useEffect } from "react";
import Calendar from "react-calendar"; // Install via npm install react-calendar
import "react-calendar/dist/Calendar.css"; // Calendar CSS
import { db } from "../../firebaseConfig";
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc } from "firebase/firestore";
import * as XLSX from "xlsx"; // Import xlsx library
import { saveAs } from "file-saver"; // Import file-saver for download
import "./eve.css";

function EventManager() {
  const [bookings, setBookings] = useState([]);
  const [selectedDate, setSelectedDate] = useState(null);
  const [allocatedSupplies, setAllocatedSupplies] = useState({});
  const [supplies, setSupplies] = useState([]);
  const [newSupply, setNewSupply] = useState("");
  const [newQuantity, setNewQuantity] = useState("");
  const [editIndex, setEditIndex] = useState(null);
  const [editId, setEditId] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");

  const SUPPLIES_PER_ATTENDEE = {
    chairs: 1,
    tables: 0.2,
    plates: 1.2,
    bowls: 1.1,
    napkins: 2.1,
    utensils: 2.5,
  };

  const suppliesCollectionRef = collection(db, "supplies");
  const bookingsCollectionRef = collection(db, "bookings");

  useEffect(() => {
    const fetchBookings = async () => {
      const bookingsSnapshot = await getDocs(bookingsCollectionRef);
      const fetchedBookings = bookingsSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setBookings(fetchedBookings);
      allocateSupplies(fetchedBookings);
    };

    fetchBookings();
  }, []);

  useEffect(() => {
    const fetchSupplies = async () => {
      const data = await getDocs(suppliesCollectionRef);
      setSupplies(data.docs.map((doc) => ({ ...doc.data(), id: doc.id })));
    };
    fetchSupplies();
  }, []);

  const allocateSupplies = (bookings) => {
    const allocations = {};
    bookings.forEach((booking) => {
      const date = new Date(booking.eventDate.seconds * 1000).toDateString();
      const numAttendees = booking.numAttendees;

      if (!allocations[date]) {
        allocations[date] = {};
      }

      Object.keys(SUPPLIES_PER_ATTENDEE).forEach((supply) => {
        const neededSupply = Math.ceil(
          numAttendees * SUPPLIES_PER_ATTENDEE[supply]
        );
        allocations[date][supply] =
          (allocations[date][supply] || 0) + neededSupply;
      });
    });

    setAllocatedSupplies(allocations);
  };

  const bookedDates = bookings.map((booking) =>
    new Date(booking.eventDate.seconds * 1000)
  );

  const renderSuppliesForDate = (date) => {
    const dateString = date.toDateString();
    const suppliesForDate = allocatedSupplies[dateString];

    if (!suppliesForDate) {
      return <p style={{ color: "#6A1B9A" }}>No bookings for this date.</p>;
    }

    return (
      <ul style={{ listStyleType: "none", paddingLeft: "0", color: "#6A1B9A" }}>
        {Object.keys(suppliesForDate).map((supply) => (
          <li key={supply} style={{ marginBottom: "5px" }}>
            <strong>
              {supply.charAt(0).toUpperCase() + supply.slice(1)}:
            </strong>{" "}
            {suppliesForDate[supply]}
          </li>
        ))}
      </ul>
    );
  };

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

  const filteredSupplies = supplies.filter((supply) => {
    const lowerCaseQuery = searchQuery.toLowerCase();
    return (
      supply.name.toLowerCase().includes(lowerCaseQuery) ||
      supply.quantity.toString().includes(lowerCaseQuery)
    );
  });

  return (
    <div
  style={{
    display: "flex",
    flexDirection: "column",
    gap: "20px",
    padding: "20px",
    fontFamily: "'Poppins', sans-serif",
    backgroundColor: "#f8f9fa",
    color: "#6A1B9A",
    height: "100vh",
    boxSizing: "border-box",
  }}
>
  {/* Top Row: Calendar and Supplies Needed */}
  <div
    style={{
      display: "flex",
      justifyContent: "space-between",
      alignItems: "flex-start",
      gap: "20px",
      flex: "1 1 auto",
    }}
  >
    {/* Calendar */}
    <div
      style={{
        flex: "1 1 50%",
        background: "#ffffff",
        padding: "20px",
        borderRadius: "10px",
        boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
        height: "100%",
      }}
    >
      <Calendar
        onChange={setSelectedDate}
        value={selectedDate}
        tileClassName={({ date }) =>
          bookedDates.find(
            (bookedDate) =>
              bookedDate.toDateString() === date.toDateString()
          )
            ? "booked"
            : null
        }
      />
    </div>

    {/* Supplies Section */}
    <div
      style={{
        flex: "1 1 50%",
        background: "#ffffff",
        padding: "20px",
        borderRadius: "10px",
        boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
        height: "100%",
        overflowY: "auto",
      }}
    >
      <h2>
        Supplies needed for{" "}
        {selectedDate ? selectedDate.toDateString() : "Select a date"}
      </h2>
      {selectedDate ? renderSuppliesForDate(selectedDate) : (
        <p>Select a date to see details.</p>
      )}
    </div>
  </div>

  {/* Bottom Row: Manage Supplies */}
  <div
    style={{
      flex: "0 0 auto",
      background: "#ffffff",
      padding: "20px",
      borderRadius: "10px",
      boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
      maxHeight: "400px",
      overflowY: "auto",
    }}
  >
    <h2>Manage Supplies</h2>
    <div style={{ display: "flex", gap: "10px", marginBottom: "10px" }}>
      <input
        type="text"
        value={newSupply}
        onChange={(e) => setNewSupply(e.target.value)}
        placeholder="Supply Name"
        style={{
          flex: "1",
          padding: "10px",
          borderRadius: "5px",
          border: "1px solid #ddd",
        }}
      />
      <input
        type="number"
        value={newQuantity}
        onChange={(e) => setNewQuantity(e.target.value)}
        placeholder="Quantity"
        style={{
          flex: "1",
          padding: "10px",
          borderRadius: "5px",
          border: "1px solid #ddd",
        }}
      />
      {editIndex !== null ? (
        <button
          onClick={handleUpdateSupply}
          style={{
            padding: "10px 15px",
            background: "#6A1B9A",
            color: "#fff",
            border: "none",
            borderRadius: "5px",
            cursor: "pointer",
          }}
        >
          Update
        </button>
      ) : (
        <button
          onClick={handleAddSupply}
          style={{
            padding: "10px 15px",
            background: "#6A1B9A",
            color: "#fff",
            border: "none",
            borderRadius: "5px",
            cursor: "pointer",
          }}
        >
          Add
        </button>
      )}
    </div>

    <input
      type="text"
      value={searchQuery}
      onChange={(e) => setSearchQuery(e.target.value)}
      placeholder="Search Supplies"
      style={{
        width: "100%",
        padding: "10px",
        borderRadius: "5px",
        border: "1px solid #ddd",
        marginBottom: "10px",
      }}
    />

    <table style={{ width: "100%", borderCollapse: "collapse" }}>
      <thead>
        <tr style={{ background: "#F2F2F2" }}>
          <th style={{ padding: "10px", textAlign: "left" }}>Supply Name</th>
          <th style={{ padding: "10px", textAlign: "left" }}>Quantity</th>
          <th style={{ padding: "10px", textAlign: "left" }}>Actions</th>
        </tr>
      </thead>
      <tbody>
        {filteredSupplies.map((supply, index) => (
          <tr key={supply.id} style={{ borderBottom: "1px solid #ddd" }}>
            <td style={{ padding: "10px" }}>{supply.name}</td>
            <td style={{ padding: "10px" }}>{supply.quantity}</td>
            <td style={{ padding: "10px" }}>
              <button
                onClick={() => handleEditSupply(index)}
                style={{
                  marginRight: "5px",
                  padding: "5px 10px",
                  background: "#6A1B9A",
                  color: "#fff",
                  border: "none",
                  borderRadius: "5px",
                  cursor: "pointer",
                }}
              >
                Edit
              </button>
              <button
                onClick={() => handleDeleteSupply(supply.id)}
                style={{
                  padding: "5px 10px",
                  background: "#E57373",
                  color: "#fff",
                  border: "none",
                  borderRadius: "5px",
                  cursor: "pointer",
                }}
              >
                Delete
              </button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>

    <button
      onClick={handleExportExcel}
      style={{
        marginTop: "10px",
        padding: "10px 15px",
        background: "#6A1B9A",
        color: "#fff",
        border: "none",
        borderRadius: "5px",
        cursor: "pointer",
      }}
    >
      Download Supplies
    </button>
  </div>
</div>

  );
}

export default EventManager;
