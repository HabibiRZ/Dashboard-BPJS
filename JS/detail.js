let statusChart = null;
let sumberDanaChart = null;
let currentInstansi = null;

// Configuration for Google Sheets API (sama dengan main)
const SHEET_CONFIG = {
    sheetId: "1h9NVeC4Gca7IwQkuLd3kNSqaO4xLbgCBIMQK7I26HGs",
    apiKey: "AIzaSyDDChj-Syqytv2HboLnbflQu7-u_5VAYIE",
    range: "A2:M1000" // Adjust range as needed
};

document.addEventListener('DOMContentLoaded', async () => {
    // Ambil parameter instansi dari URL
    const urlParams = new URLSearchParams(window.location.search);
    currentInstansi = urlParams.get('instansi');
    
    if (!currentInstansi) {
        console.error("❌ No instansi parameter found in URL");
        showError("Parameter instansi tidak ditemukan dalam URL");
        return;
    }
    
    console.log(`🏢 Loading data for instansi: ${currentInstansi}`);
    
    // Update title dengan nama instansi
    document.getElementById('instansiTitle').textContent = `Detail Proyek - ${currentInstansi}`;
    document.title = `Detail Proyek - ${currentInstansi}`;
    
    showLoading(true);
    try {
        const allData = await fetchGoogleSheetsData();
       
        
        if (allData && allData.length > 0) {
            // Filter data berdasarkan nama instansi
            const filteredData = filterDataByInstansi(allData, currentInstansi);
           
            
            if (filteredData.length > 0) {
                updateDetailDashboard(filteredData);
                
                
                // Log detail data untuk debugging
                logDetailedData(filteredData);
            } else {
                console.log(`⚠️ No projects found for instansi: ${currentInstansi}`);
                showError(`Tidak ada proyek ditemukan untuk instansi: ${currentInstansi}`);
            }
        } else {
            console.log("⚠️ No data found from Google Sheets");
            showError("Tidak ada data ditemukan dari Google Sheets");
        }
    } catch (error) {
        console.error("❌ Error loading data:", error);
        showError("Gagal memuat data dari Google Sheets. Silakan coba lagi.");
    } finally {
        showLoading(false);
    }
});

async function fetchGoogleSheetsData() {
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_CONFIG.sheetId}/values/${SHEET_CONFIG.range}?key=${SHEET_CONFIG.apiKey}`;
    
    try {
        console.log("📡 Fetching data from Google Sheets...");
        const response = await fetch(url);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const result = await response.json();
        
        if (!result.values || result.values.length === 0) {
            console.log("⚠️ No data found in the specified range");
            return [];
        }
        
        // Headers sesuai dengan struktur data
        const headers = [
            'NO', 'KODE RUP', 'KODE TENDER', 'KODE PROYEK', 'NAMA PROYEK',
            'NILAI PROYEK', 'SUMBER DANA', 'NAMA INSTANSI', 'NAMA PELAKSANA',
            'SUMBER POTENSI', 'STATUS POTENSI', 'TGL SPMK'
        ];
        
        // Convert rows to objects
        const data = result.values.map((row, index) => {
            const rowData = {};
            headers.forEach((header, colIndex) => {
                rowData[header] = row[colIndex] || '';
            });
            return rowData;
        });
        
        return processData(data);
        
    } catch (error) {
        console.error("❌ Error fetching Google Sheets data:", error);
        throw error;
    }
}

function processData(rawData) {
    return rawData.map((row, index) => {
        const nilaiProyek = cleanCurrencyValue(row['NILAI PROYEK'] || '0');
        
        return {
            no: row['NO'] || (index + 1).toString(),
            kodeRup: row['KODE RUP'] || '',
            kodeTender: row['KODE TENDER'] || '',
            kodeProyek: row['KODE PROYEK'] || '',
            namaProyek: row['NAMA PROYEK'] || '',
            nilaiProyek: nilaiProyek,
            sumberDana: row['SUMBER DANA'] || 'Tidak Diketahui',
            namaInstansi: row['NAMA INSTANSI'] || row['NAMA INSTANSI / SATKER'] || 'Tidak Diketahui',
            namaPelaksana: row['NAMA PELAKSANA'] || '',
            sumberPotensi: row['SUMBER POTENSI'] || '',
            statusPotensi: row['STATUS POTENSI'] || 'Tidak Diketahui',
            tglSpmk: row['TGL SPMK'] || ''
        };
    }).filter(item => item.namaProyek && item.namaProyek.trim() !== '');
}

function filterDataByInstansi(data, instansiName) {
    console.log(`🔍 Filtering data for instansi: "${instansiName}"`);
    
    const filtered = data.filter(project => {
        const projectInstansi = project.namaInstansi || '';
        const isMatch = projectInstansi.toLowerCase() === instansiName.toLowerCase();
        
        if (isMatch) {
            console.log(`✅ Match found: ${project.namaProyek} - ${formatCurrency(project.nilaiProyek)}`);
        }
        
        return isMatch;
    });
    
    console.log(`📊 Filter results:`);
    console.log(`   - Total projects in database: ${data.length}`);
    console.log(`   - Projects matching "${instansiName}": ${filtered.length}`);
    
    return filtered;
}

function logDetailedData(data) {
    console.log(`\n📋 DETAILED DATA FOR: ${currentInstansi}`);
    console.log(`=`.repeat(80));
    
    data.forEach((project, index) => {
        console.log(`\n${index + 1}. ${project.namaProyek}`);
        console.log(`   📄 Kode RUP: ${project.kodeRup}`);
        console.log(`   🏷️  Kode Tender: ${project.kodeTender}`);
        console.log(`   🔖 Kode Proyek: ${project.kodeProyek}`);
        console.log(`   💰 Nilai: ${formatCurrency(project.nilaiProyek)}`);
        console.log(`   💳 Sumber Dana: ${project.sumberDana}`);
        console.log(`   👷 Pelaksana: ${project.namaPelaksana}`);
        console.log(`   📊 Status: ${project.statusPotensi}`);
        console.log(`   📅 Tanggal SPMK: ${project.tglSpmk}`);
        console.log(`   🌐 Sumber Potensi: ${project.sumberPotensi}`);
    });
    
    // Summary statistics
    const totalValue = data.reduce((sum, project) => sum + project.nilaiProyek, 0);
    const avgValue = totalValue / data.length;
    
    console.log(`\n📊 SUMMARY STATISTICS:`);
    console.log(`=`.repeat(50));
    console.log(`   📈 Total Projects: ${data.length}`);
    console.log(`   💰 Total Value: ${formatCurrency(totalValue)}`);
    console.log(`   📊 Average Value: ${formatCurrency(avgValue)}`);
    
    // Status distribution
    const statusCounts = {};
    data.forEach(project => {
        const status = project.statusPotensi || 'Tidak Diketahui';
        statusCounts[status] = (statusCounts[status] || 0) + 1;
    });
    
    console.log(`\n📋 STATUS DISTRIBUTION:`);
    Object.entries(statusCounts).forEach(([status, count]) => {
        console.log(`   ${status}: ${count} projects`);
    });
    
    // Sumber dana distribution
    const sumberDanaCounts = {};
    data.forEach(project => {
        const sumber = project.sumberDana || 'Tidak Diketahui';
        sumberDanaCounts[sumber] = (sumberDanaCounts[sumber] || 0) + 1;
    });
    
    console.log(`\n💳 FUNDING SOURCE DISTRIBUTION:`);
    Object.entries(sumberDanaCounts).forEach(([sumber, count]) => {
        console.log(`   ${sumber}: ${count} projects`);
    });
}

function cleanCurrencyValue(value) {
    if (typeof value === 'number') return value;
    if (typeof value === 'string') {
        const cleaned = value.replace(/[^\d.-]/g, '');
        const parsed = parseFloat(cleaned) || 0;
        return parsed;
    }
    return 0;
}

function formatCurrency(amount) {
    return new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    }).format(amount);
}

function updateDetailDashboard(data) {
    updateSummaryCards(data);
    updateCharts(data);
    updateDetailTable(data);
}

function updateSummaryCards(data) {
    const totalProjects = data.length;
    const totalValue = data.reduce((sum, project) => sum + project.nilaiProyek, 0);
    const avgValue = totalValue / totalProjects || 0;

    document.getElementById('totalProjects').textContent = totalProjects.toLocaleString('id-ID');
    document.getElementById('totalValue').textContent = formatCurrency(totalValue);
    document.getElementById('avgValue').textContent = formatCurrency(avgValue);
    
    console.log(`📊 Summary Cards Updated:`);
    console.log(`   Total Projects: ${totalProjects}`);
    console.log(`   Total Value: ${formatCurrency(totalValue)}`);
    console.log(`   Average Value: ${formatCurrency(avgValue)}`);
}

function updateCharts(data) {
    updateStatusChart(data);
    updateSumberDanaChart(data);
}

function updateStatusChart(data) {
    const statusCounts = {};
    console.log(data)
    data.forEach(project => {
        const status = project.tglSpmk;
        statusCounts[status] = (statusCounts[status] || 0) + 1;
    });
    
    const colorMap = {
        'valid': '#28a745',
        'belum tl': '#dc3545',
        'terdaftar': '#0066cc',
        'tidak diketahui': '#6c757d',
        'lkpp': '#ffc107'
    };
    
    const labels = Object.keys(statusCounts);
    const values = Object.values(statusCounts);
    const colors = labels.map(label => colorMap[label.toLowerCase()] || '#6c757d');

    if (statusChart) { 
        statusChart.destroy(); 
    }

    const ctx = document.getElementById('statusChart').getContext('2d');
    statusChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: labels,
            datasets: [{
                data: values,
                backgroundColor: colors,
                borderWidth: 2,
                borderColor: 'var(--color-surface)'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { 
                    position: 'bottom', 
                    labels: { 
                        color: 'var(--color-text-dark)',
                        usePointStyle: true,
                        padding: 20
                    } 
                },
                tooltip: { 
                    callbacks: { 
                        label: (tooltipItem) => `${tooltipItem.label}: ${tooltipItem.raw.toLocaleString('id-ID')} proyek` 
                    } 
                }
            }
        }
    });
    
    console.log(`📊 Status Chart Updated:`, statusCounts);
}

function updateSumberDanaChart(data) {
    const sumberDanaValues = {};
    data.forEach(project => {
        const sumber = project.sumberDana || 'Tidak Diketahui';
        sumberDanaValues[sumber] = (sumberDanaValues[sumber] || 0) + project.nilaiProyek;
    });

    const labels = Object.keys(sumberDanaValues);
    const values = Object.values(sumberDanaValues);
    const colors = ['#004c99', '#0066cc', '#ffcc00', '#28a745', '#4BC0C0', '#ff9f40', '#dc3545', '#9966ff'];

    if (sumberDanaChart) { 
        sumberDanaChart.destroy(); 
    }

    const ctx = document.getElementById('sumberDanaChart').getContext('2d');
    sumberDanaChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Total Nilai Proyek',
                data: values,
                backgroundColor: colors,
                borderColor: colors,
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            indexAxis: 'y',
            plugins: {
                legend: { display: false },
                tooltip: { 
                    callbacks: { 
                        label: (tooltipItem) => `${formatCurrency(tooltipItem.raw)}` 
                    } 
                }
            },
            scales: {
                x: {
                    beginAtZero: true,
                    ticks: { 
                        callback: (value) => formatCurrency(value), 
                        color: 'var(--color-text-dark)' 
                    },
                    grid: { color: '#e0e0e0' }
                },
                y: {
                    ticks: { 
                        color: 'var(--color-text-dark)',
                        font: { size: 11 }
                    },
                    grid: { color: '#e0e0e0' }
                }
            }
        }
    });
    
    console.log(`📊 Sumber Dana Chart Updated:`, sumberDanaValues);
}

function updateDetailTable(data) {
    const tableBody = document.getElementById('tableBody');
    tableBody.innerHTML = '';
    
    console.log(`📋 Building table with ${data.length} rows`);
    console.log(data)
    data.forEach((project, index) => {
        const row = document.createElement('tr');
        
        // Format status badge
        const statusClass = getStatusBadgeClass(project.tglSpmk);
        const statusBadge = `<span class="status-badge ${statusClass}">${project.tglSpmk}</span>`;
        
        row.innerHTML = `
            <td>${index + 1}</td>
            <td>${project.kodeRup || '-'}</td>
            <td>${project.kodeTender || '-'}</td>
            <td>${project.kodeProyek || '-'}</td>
            <td>
                <div style="font-weight: 600; margin-bottom: 4px;">${project.namaProyek}</div>
                <div style="font-size: 0.8em; color: #666;">
                    Pelaksana: ${project.namaPelaksana || 'Tidak diketahui'}
                </div>
            </td>
            <td style="font-weight: 600; color: var(--color-primary);">
                ${formatCurrency(project.nilaiProyek)}
            </td>
            <td>${project.sumberDana}</td>
            <td>${statusBadge}</td>
            
        `;
        // <td>${project.tglSpmk || '-'}</td>
        tableBody.appendChild(row);
    });
    
    console.log(`✅ Table updated with ${data.length} projects`);
}

function getStatusBadgeClass(status) {
    const statusLower = (status || '').toLowerCase();
    switch(statusLower) {
        case 'valid': return 'status-valid';
        case 'belum tl': return 'status-belum-tl';
        case 'terdaftar': return 'status-terdaftar';
        case 'lkpp': return 'status-lkpp';
        default: return 'status-unknown';
    }
}

function showLoading(show) {
    let loader = document.getElementById('loadingIndicator');
    if (show) {
        if (!loader) {
            loader = document.createElement('div');
            loader.id = 'loadingIndicator';
            loader.innerHTML = `
                <div style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); z-index: 9999; display: flex; align-items: center; justify-content: center;">
                    <div style="background: white; padding: 20px; border-radius: 8px; text-align: center;">
                        <div style="border: 4px solid #f3f3f3; border-top: 4px solid #004c99; border-radius: 50%; width: 40px; height: 40px; animation: spin 1s linear infinite; margin: 0 auto 10px;"></div>
                        <p>Memuat data untuk ${currentInstansi}...</p>
                    </div>
                </div>
                <style>
                    @keyframes spin {
                        0% { transform: rotate(0deg); }
                        100% { transform: rotate(360deg); }
                    }
                </style>
            `;
            document.body.appendChild(loader);
        }
        loader.style.display = 'block';
    } else if (loader) {
        loader.style.display = 'none';
    }
}

function showError(message) {
    const errorDiv = document.createElement('div');
    errorDiv.innerHTML = `
        <div style="position: fixed; top: 20px; right: 20px; background: #dc3545; color: white; padding: 15px; border-radius: 8px; z-index: 10000; max-width: 300px;">
            <strong>Error:</strong> ${message}
            <button onclick="this.parentElement.remove()" style="float: right; background: none; border: none; color: white; font-size: 18px; cursor: pointer; margin-left: 10px;">&times;</button>
        </div>
    `;
    document.body.appendChild(errorDiv);
    
    // Auto remove after 5 seconds
    setTimeout(() => {
        if (errorDiv.parentElement) {
            errorDiv.remove();
        }
    }, 5000);
}

// Function untuk refresh data detail
function refreshDetailData() {
    if (!currentInstansi) {
        showError("Nama instansi tidak ditemukan");
        return;
    }
    
    console.log(`🔄 Refreshing data for: ${currentInstansi}`);
    showLoading(true);
    
    fetchGoogleSheetsData()
        .then(allData => {
            if (allData && allData.length > 0) {
                const filteredData = filterDataByInstansi(allData, currentInstansi);
                updateDetailDashboard(filteredData);
                logDetailedData(filteredData);
                console.log(`✅ Data refreshed successfully for ${currentInstansi}: ${filteredData.length} records`);
            }
        })
        .catch(error => {
            console.error("❌ Error refreshing data:", error);
            showError("Gagal memperbarui data. Silakan coba lagi.");
        })
        .finally(() => {
            showLoading(false);
        });
}   