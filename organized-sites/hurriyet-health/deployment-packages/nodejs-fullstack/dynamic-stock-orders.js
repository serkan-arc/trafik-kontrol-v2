// HEMEN ÇALIŞAN STOK VE SİPARİŞ SİSTEMİ
console.log('SCRIPT BAŞLADI!');

let currentStock = 420;
const names = ['Ahmet T.', 'Mehmet K.', 'Ali B.', 'Fatma S.', 'Ayse Y.', 'Emre D.'];

function updateStock() {
    console.log('STOK GÜNCELLENİYOR:', currentStock);
    const stockEl = document.querySelector('.stock-number');
    if (stockEl) {
        if (currentStock > 100) { currentStock -= Math.floor(Math.random() * 3) + 1; }
        stockEl.textContent = currentStock;
        console.log('YENİ STOK:', currentStock);
    } else {
        console.log('STOK ELEMANI BULUNAMADI!');
    }
}

function showOrder() {
    console.log('SİPARİŞ BİLDİRİMİ GÖSTER');
    const formP = document.querySelector('.form-container p');
    if (formP) {
        const name = names[Math.floor(Math.random() * names.length)];
        const amount = Math.floor(Math.random() * 5) + 1;
        
        const notification = document.createElement('div');
        notification.style.cssText = 'color: #d41f2c !important; font-weight: bold; font-size: 16px; text-align: center; margin: 10px 0; padding: 8px 0;';
        notification.textContent = name + ' ' + amount + ' SIPARIS VERDI';
        
        // Önceki bildirimi sil
        const old = document.querySelector('.order-notification');
        if (old) old.remove();
        
        notification.className = 'order-notification';
        formP.parentNode.insertBefore(notification, formP.nextSibling);
        
        setTimeout(() => {
            if (notification.parentNode) notification.remove();
        }, 3000);
        
        console.log('BİLDİRİM EKLENDİ:', notification.textContent);
    } else {
        console.log('FORM P ELEMANI BULUNAMADI!');
    }
}

// HEMEN BAŞLAT
setTimeout(() => {
    console.log('İLK GÜNCELLEME BAŞLADI');
    updateStock();
    showOrder();
    
    // Her 2 saniyede bir çalıştır
    setInterval(updateStock, 30000);
    setInterval(showOrder, 30000);
}, 1000);

console.log('SCRIPT HAZIR, 1 SANİYE SONRA BAŞLAYACAK');
