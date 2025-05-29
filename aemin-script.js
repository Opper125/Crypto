import { Chart } from "@/components/ui/chart"
// Supabase Configuration
const SUPABASE_URL = "https://uwuztdwbjwkuoqmclcpq.supabase.co"
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV3dXp0ZHdiandrdW9xbWNsY3BxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDc5NDc3MzIsImV4cCI6MjA2MzUyMzczMn0.79WzYhDz-v80SbhOWEIegtSJKO6AtBcLN5REasUz1CI"

const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

// Admin Configuration
const ADMIN_EMAIL = "crakb68@gmail.com"
const ADMIN_PIN = "155872"

// Global Variables
let isAdminLoggedIn = false
const dashboardData = {}
const charts = {}

// DOM Elements
const adminLoginModal = document.getElementById("adminLoginModal")
const adminDashboard = document.getElementById("adminDashboard")

// Initialize Admin Panel
document.addEventListener("DOMContentLoaded", () => {
  initializeAdminPanel()
})

function initializeAdminPanel() {
  // Show login modal
  adminLoginModal.style.display = "flex"

  // Initialize event listeners
  initializeEventListeners()
}

function initializeEventListeners() {
  // Admin login form
  document.getElementById("adminLoginForm").addEventListener("submit", handleAdminLogin)

  // Navigation
  document.querySelectorAll(".nav-link").forEach((link) => {
    link.addEventListener("click", function (e) {
      e.preventDefault()
      const section = this.dataset.section
      switchAdminSection(section)
    })
  })

  // Logout
  document.getElementById("adminLogoutBtn").addEventListener("click", handleAdminLogout)

  // Close modals
  document.querySelectorAll(".close").forEach((closeBtn) => {
    closeBtn.addEventListener("click", function () {
      this.closest(".modal").style.display = "none"
    })
  })

  // Search functionality
  const userSearch = document.getElementById("userSearch")
  if (userSearch) {
    userSearch.addEventListener("input", filterUsers)
  }

  // Filters
  const transactionTypeFilter = document.getElementById("transactionTypeFilter")
  const transactionStatusFilter = document.getElementById("transactionStatusFilter")
  const transactionDateFilter = document.getElementById("transactionDateFilter")

  if (transactionTypeFilter) transactionTypeFilter.addEventListener("change", filterTransactions)
  if (transactionStatusFilter) transactionStatusFilter.addEventListener("change", filterTransactions)
  if (transactionDateFilter) transactionDateFilter.addEventListener("change", filterTransactions)

  // Market controls
  const updatePricesBtn = document.getElementById("updatePricesBtn")
  const updatePriceBtn = document.getElementById("updatePriceBtn")

  if (updatePricesBtn) updatePricesBtn.addEventListener("click", updateAllPrices)
  if (updatePriceBtn) updatePriceBtn.addEventListener("click", updateSinglePrice)

  // Log filters
  const logDateFilter = document.getElementById("logDateFilter")
  const logActionFilter = document.getElementById("logActionFilter")

  if (logDateFilter) logDateFilter.addEventListener("change", filterLogs)
  if (logActionFilter) logActionFilter.addEventListener("change", filterLogs)

  // Wallet management form
  const walletManagementForm = document.getElementById("walletManagementForm")
  if (walletManagementForm) {
    walletManagementForm.addEventListener("submit", handleWalletManagement)
  }

  // Window events
  window.addEventListener("click", (e) => {
    if (e.target.classList.contains("modal")) {
      e.target.style.display = "none"
    }
  })
}

// Admin Login/Logout
async function handleAdminLogin(e) {
  e.preventDefault()

  const email = document.getElementById("adminEmail").value
  const pin = document.getElementById("adminPin").value

  if (email === ADMIN_EMAIL && pin === ADMIN_PIN) {
    isAdminLoggedIn = true
    adminLoginModal.style.display = "none"
    adminDashboard.style.display = "flex"

    // Log admin login
    await logAdminAction("admin_login", null, { message: "Admin logged in" })

    // Load dashboard data
    loadDashboardData()
    showAdminMessage("အကောင့်ဝင်ရောက်မှု အောင်မြင်ပါသည်", "success")
  } else {
    showAdminMessage("အကောင့်ဝင်ရောက်မှု မအောင်မြင်ပါ။ အချက်အလက်များ စစ်ဆေးပါ", "error")
  }
}

function handleAdminLogout() {
  isAdminLoggedIn = false
  adminDashboard.style.display = "none"
  adminLoginModal.style.display = "flex"
  showAdminMessage("အကောင့်မှ အောင်မြင်စွာ ထွက်ခဲ့သည်", "success")
}

// Section Navigation
function switchAdminSection(section) {
  // Update active nav link
  document.querySelectorAll(".nav-link").forEach((link) => {
    link.classList.remove("active")
  })
  document.querySelector(`[data-section="${section}"]`).classList.add("active")

  // Update active section
  document.querySelectorAll(".admin-section").forEach((sec) => {
    sec.classList.remove("active")
  })
  document.getElementById(`${section}Section`).classList.add("active")

  // Update section title
  const sectionTitles = {
    overview: "ခြုံငုံသုံးသပ်ချက်",
    users: "အသုံးပြုသူများ စီမံခန့်ခွဲမှု",
    transactions: "ငွေလွှဲမှတ်တမ်းများ",
    kyc: "KYC အတည်ပြုခြင်း",
    market: "စျေးကွက်ထိန်းချုပ်မှု",
    logs: "လုပ်ဆောင်ချက်မှတ်တမ်း",
  }
  document.getElementById("sectionTitle").textContent = sectionTitles[section]

  // Load section specific data
  switch (section) {
    case "overview":
      loadDashboardData()
      break
    case "users":
      loadUsers()
      break
    case "transactions":
      loadTransactions()
      break
    case "kyc":
      loadKYCRequests()
      break
    case "market":
      loadMarketData()
      break
    case "logs":
      loadAdminLogs()
      break
  }
}

// Dashboard Data
async function loadDashboardData() {
  try {
    // Load stats
    const { data: users } = await supabase.from("users").select("id")
    const { data: transactions } = await supabase.from("transactions").select("amount")
    const { data: pendingKYC } = await supabase.from("users").select("id").eq("kyc_status", "pending")

    // Calculate total volume
    let totalVolume = 0
    if (transactions) {
      totalVolume = transactions.reduce((sum, tx) => sum + Number(tx.amount), 0)
    }

    // Update stats
    document.getElementById("totalUsers").textContent = users ? users.length : 0
    document.getElementById("totalVolume").textContent = `$${formatNumber(totalVolume)}`
    document.getElementById("totalTransactions").textContent = transactions ? transactions.length : 0
    document.getElementById("pendingKYC").textContent = pendingKYC ? pendingKYC.length : 0

    // Load charts data
    loadCharts()

    // Load recent activities
    loadRecentActivities()
  } catch (error) {
    console.error("Error loading dashboard data:", error)
    showAdminMessage("ဒက်ရှ်ဘုတ် ဒေတာ ရယူရာတွင် အမှားဖြစ်ပွားခဲ့သည်", "error")
  }
}

async function loadCharts() {
  try {
    // Daily volume chart
    const dailyVolumeCtx = document.getElementById("dailyVolumeChart").getContext("2d")
    const dailyVolumeData = {
      labels: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
      datasets: [
        {
          label: "ကုန်သွယ်မှုပမာဏ",
          data: [12000, 19000, 15000, 25000, 22000, 30000, 35000],
          backgroundColor: "rgba(102, 126, 234, 0.2)",
          borderColor: "rgba(102, 126, 234, 1)",
          borderWidth: 2,
          tension: 0.4,
        },
      ],
    }

    if (charts.dailyVolume) {
      charts.dailyVolume.destroy()
    }

    charts.dailyVolume = new Chart(dailyVolumeCtx, {
      type: "line",
      data: dailyVolumeData,
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          y: {
            beginAtZero: true,
            ticks: {
              callback: (value) => "$" + value.toLocaleString(),
            },
          },
        },
      },
    })

    // User growth chart
    const userGrowthCtx = document.getElementById("userGrowthChart").getContext("2d")
    const userGrowthData = {
      labels: ["Jan", "Feb", "Mar", "Apr", "May", "Jun"],
      datasets: [
        {
          label: "အသုံးပြုသူ အရေအတွက်",
          data: [50, 120, 190, 250, 300, 380],
          backgroundColor: "rgba(118, 75, 162, 0.2)",
          borderColor: "rgba(118, 75, 162, 1)",
          borderWidth: 2,
          tension: 0.4,
        },
      ],
    }

    if (charts.userGrowth) {
      charts.userGrowth.destroy()
    }

    charts.userGrowth = new Chart(userGrowthCtx, {
      type: "line",
      data: userGrowthData,
      options: {
        responsive: true,
        maintainAspectRatio: false,
      },
    })
  } catch (error) {
    console.error("Error loading charts:", error)
  }
}

async function loadRecentActivities() {
  try {
    const { data: logs, error } = await supabase
      .from("admin_logs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(5)

    if (error) throw error

    const recentActivities = document.getElementById("recentActivities")
    recentActivities.innerHTML = ""

    if (logs && logs.length > 0) {
      logs.forEach((log) => {
        const activityItem = document.createElement("div")
        activityItem.className = "activity-item"
        activityItem.innerHTML = `
                    <div class="activity-icon">
                        <i class="fas ${getActionIcon(log.action)}"></i>
                    </div>
                    <div class="activity-details">
                        <h4>${getActionTitle(log.action)}</h4>
                        <p>${log.details?.message || ""}</p>
                    </div>
                    <div class="activity-time">
                        ${formatTimeAgo(log.created_at)}
                    </div>
                `
        recentActivities.appendChild(activityItem)
      })
    } else {
      recentActivities.innerHTML = '<div class="no-activities">လတ်တလော လုပ်ဆောင်ချက်များ မရှိပါ</div>'
    }
  } catch (error) {
    console.error("Error loading recent activities:", error)
  }
}

// Users Management
async function loadUsers() {
  try {
    const { data: users, error } = await supabase.from("users").select("*").order("created_at", { ascending: false })

    if (error) throw error

    const usersTableBody = document.getElementById("usersTableBody")
    usersTableBody.innerHTML = ""

    if (users && users.length > 0) {
      for (const user of users) {
        // Get user's total balance in USD
        const { data: wallets } = await supabase.from("wallets").select("*").eq("user_id", user.id)
        let totalBalance = 0

        if (wallets && wallets.length > 0) {
          for (const wallet of wallets) {
            const { data: marketData } = await supabase
              .from("market_data")
              .select("price_usd")
              .eq("symbol", wallet.currency)
              .single()

            if (marketData) {
              totalBalance += Number(wallet.balance) * Number(marketData.price_usd)
            }
          }
        }

        const row = document.createElement("tr")
        row.innerHTML = `
                    <td>${user.full_name}</td>
                    <td>${user.email}</td>
                    <td>${user.country || "N/A"}</td>
                    <td>
                        <span class="status-badge ${user.kyc_status}">
                            ${getKYCStatusText(user.kyc_status)}
                        </span>
                    </td>
                    <td>$${formatNumber(totalBalance)}</td>
                    <td>${formatDate(user.created_at)}</td>
                    <td>
                        <button class="action-btn view" onclick="viewUserDetails('${user.id}')">
                            <i class="fas fa-eye"></i> ကြည့်ရန်
                        </button>
                        <button class="action-btn edit" onclick="showWalletManagement('${user.id}')">
                            <i class="fas fa-wallet"></i> ပိုက်ဆံအိတ်
                        </button>
                    </td>
                `
        usersTableBody.appendChild(row)
      }
    } else {
      usersTableBody.innerHTML = '<tr><td colspan="7" class="no-data">အသုံးပြုသူ မရှိပါ</td></tr>'
    }
  } catch (error) {
    console.error("Error loading users:", error)
    showAdminMessage("အသုံးပြုသူများ ရယူရာတွင် အမှားဖြစ်ပွားခဲ့သည်", "error")
  }
}

function filterUsers() {
  const searchTerm = document.getElementById("userSearch").value.toLowerCase()
  const rows = document.querySelectorAll("#usersTableBody tr")

  rows.forEach((row) => {
    const name = row.cells[0].textContent.toLowerCase()
    const email = row.cells[1].textContent.toLowerCase()
    const country = row.cells[2].textContent.toLowerCase()

    if (name.includes(searchTerm) || email.includes(searchTerm) || country.includes(searchTerm)) {
      row.style.display = ""
    } else {
      row.style.display = "none"
    }
  })
}

async function viewUserDetails(userId) {
  try {
    const { data: user, error: userError } = await supabase.from("users").select("*").eq("id", userId).single()

    if (userError) throw userError

    const { data: wallets, error: walletsError } = await supabase.from("wallets").select("*").eq("user_id", userId)

    if (walletsError) throw walletsError

    const { data: transactions, error: txError } = await supabase
      .from("transactions")
      .select("*")
      .or(`from_user_id.eq.${userId},to_user_id.eq.${userId}`)
      .order("created_at", { ascending: false })
      .limit(10)

    if (txError) throw txError

    // Calculate total balance
    let totalBalance = 0
    const walletBalances = []

    for (const wallet of wallets) {
      const { data: marketData } = await supabase
        .from("market_data")
        .select("price_usd")
        .eq("symbol", wallet.currency)
        .single()

      const usdValue = marketData ? Number(wallet.balance) * Number(marketData.price_usd) : 0
      totalBalance += usdValue

      walletBalances.push({
        currency: wallet.currency,
        balance: wallet.balance,
        usdValue: usdValue,
        address: wallet.address,
      })
    }

    // Populate user detail modal
    const userDetailContent = document.getElementById("userDetailContent")
    userDetailContent.innerHTML = `
            <div class="user-detail-content">
                <div class="user-info-section">
                    <h4>အခြေခံ အချက်အလက်များ</h4>
                    <div class="info-grid">
                        <div class="info-item">
                            <label>အမည်</label>
                            <span>${user.full_name}</span>
                        </div>
                        <div class="info-item">
                            <label>Email</label>
                            <span>${user.email}</span>
                        </div>
                        <div class="info-item">
                            <label>ဖုန်းနံပါတ်</label>
                            <span>${user.phone || "N/A"}</span>
                        </div>
                        <div class="info-item">
                            <label>နိုင်ငံ</label>
                            <span>${user.country || "N/A"}</span>
                        </div>
                        <div class="info-item">
                            <label>KYC အခြေအနေ</label>
                            <span class="status-badge ${user.kyc_status}">
                                ${getKYCStatusText(user.kyc_status)}
                            </span>
                        </div>
                        <div class="info-item">
                            <label>အကောင့်ဖွင့်သည့်ရက်</label>
                            <span>${formatDate(user.created_at)}</span>
                        </div>
                    </div>
                </div>

                <div class="user-info-section">
                    <h4>ပိုက်ဆံအိတ်များ (စုစုပေါင်း: $${formatNumber(totalBalance)})</h4>
                    <table class="admin-table">
                        <thead>
                            <tr>
                                <th>ငွေကြေးအမျိုးအစား</th>
                                <th>လက်ကျန်ငွေ</th>
                                <th>USD တန်ဖိုး</th>
                                <th>လိပ်စာ</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${walletBalances
                              .map(
                                (wallet) => `
                                <tr>
                                    <td>${wallet.currency}</td>
                                    <td>${formatNumber(wallet.balance)}</td>
                                    <td>$${formatNumber(wallet.usdValue)}</td>
                                    <td><small>${wallet.address}</small></td>
                                </tr>
                            `,
                              )
                              .join("")}
                        </tbody>
                    </table>
                </div>

                <div class="user-info-section">
                    <h4>လတ်တလော ငွေလွှဲမှတ်တမ်းများ</h4>
                    <table class="admin-table">
                        <thead>
                            <tr>
                                <th>အမျိုးအစား</th>
                                <th>ပမာဏ</th>
                                <th>အခြေအနေ</th>
                                <th>ရက်စွဲ</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${
                              transactions && transactions.length > 0
                                ? transactions
                                    .map(
                                      (tx) => `
                                    <tr>
                                        <td>${getTransactionTitle(tx.transaction_type)}</td>
                                        <td>${formatNumber(tx.amount)} ${tx.currency}</td>
                                        <td>
                                            <span class="status-badge ${tx.status}">
                                                ${getStatusText(tx.status)}
                                            </span>
                                        </td>
                                        <td>${formatDate(tx.created_at)}</td>
                                    </tr>
                                `,
                                    )
                                    .join("")
                                : '<tr><td colspan="4" class="no-data">ငွေလွှဲမှတ်တမ်း မရှိပါ</td></tr>'
                            }
                        </tbody>
                    </table>
                </div>
            </div>
        `

    // Show modal
    document.getElementById("userDetailModal").style.display = "flex"
  } catch (error) {
    console.error("Error loading user details:", error)
    showAdminMessage("အသုံးပြုသူ အချက်အလက်များ ရယူရာတွင် အမှားဖြစ်ပွားခဲ့သည်", "error")
  }
}

function showWalletManagement(userId) {
  document.getElementById("targetUserId").value = userId
  document.getElementById("walletManagementModal").style.display = "flex"
}

async function handleWalletManagement(e) {
  e.preventDefault()

  const userId = document.getElementById("targetUserId").value
  const currency = document.getElementById("walletCurrency").value
  const action = document.getElementById("walletAction").value
  const amount = Number.parseFloat(document.getElementById("walletAmount").value)
  const note = document.getElementById("walletNote").value

  if (!userId || !currency || !amount || amount <= 0) {
    showAdminMessage("ကျေးဇူးပြု၍ လိုအပ်သော အချက်လက်များကို ဖြည့်သွင်းပါ", "error")
    return
  }

  try {
    // Get current wallet balance
    const { data: wallet, error: walletError } = await supabase
      .from("wallets")
      .select("*")
      .eq("user_id", userId)
      .eq("currency", currency)
      .single()

    if (walletError) throw walletError

    // Calculate new balance
    let newBalance = Number(wallet.balance)
    if (action === "add") {
      newBalance += amount
    } else {
      if (newBalance < amount) {
        showAdminMessage("လက်ကျန်ငွေ မလုံလောက်ပါ", "error")
        return
      }
      newBalance -= amount
    }

    // Update wallet balance
    const { error: updateError } = await supabase
      .from("wallets")
      .update({ balance: newBalance })
      .eq("user_id", userId)
      .eq("currency", currency)

    if (updateError) throw updateError

    // Create transaction record
    const transactionType = action === "add" ? "deposit" : "withdrawal"
    const { error: txError } = await supabase.from("transactions").insert([
      {
        from_user_id: action === "add" ? null : userId,
        to_user_id: action === "add" ? userId : null,
        from_address: action === "add" ? "admin" : wallet.address,
        to_address: action === "add" ? wallet.address : "admin",
        currency: currency,
        amount: amount,
        fee: 0,
        transaction_type: transactionType,
        status: "completed",
        transaction_hash: generateTransactionHash(),
      },
    ])

    if (txError) throw txError

    // Log admin action
    await logAdminAction("wallet_update", userId, {
      action: action,
      currency: currency,
      amount: amount,
      note: note,
    })

    document.getElementById("walletManagementModal").style.display = "none"
    showAdminMessage("ပိုက်ဆံအိတ် အပ်ဒိတ် အောင်မြင်ပါသည်", "success")

    // Reload users data
    loadUsers()
  } catch (error) {
    console.error("Error updating wallet:", error)
    showAdminMessage("ပိုက်ဆံအိတ် အပ်ဒိတ်လုပ်ရာတွင် အမှားဖြစ်ပွားခဲ့သည်", "error")
  }
}

// Transactions Management
async function loadTransactions() {
  try {
    const { data: transactions, error } = await supabase
      .from("transactions")
      .select(
        `
                *,
                from_user:from_user_id(full_name),
                to_user:to_user_id(full_name)
            `,
      )
      .order("created_at", { ascending: false })
      .limit(100)

    if (error) throw error

    const transactionsTableBody = document.getElementById("transactionsTableBody")
    transactionsTableBody.innerHTML = ""

    if (transactions && transactions.length > 0) {
      transactions.forEach((tx) => {
        const row = document.createElement("tr")
        row.dataset.type = tx.transaction_type
        row.dataset.status = tx.status
        row.dataset.date = new Date(tx.created_at).toISOString().split("T")[0]

        row.innerHTML = `
                    <td>${tx.id.substring(0, 8)}...</td>
                    <td>${getTransactionTitle(tx.transaction_type)}</td>
                    <td>${tx.from_user ? tx.from_user.full_name : tx.from_address}</td>
                    <td>${tx.to_user ? tx.to_user.full_name : tx.to_address}</td>
                    <td>${formatNumber(tx.amount)} ${tx.currency}</td>
                    <td>
                        <span class="status-badge ${tx.status}">
                            ${getStatusText(tx.status)}
                        </span>
                    </td>
                    <td>${formatDate(tx.created_at)}</td>
                    <td>
                        ${
                          tx.status === "pending"
                            ? `
                            <button class="action-btn approve" onclick="updateTransactionStatus('${tx.id}', 'completed')">
                                <i class="fas fa-check"></i> အတည်ပြုရန်
                            </button>
                            <button class="action-btn reject" onclick="updateTransactionStatus('${tx.id}', 'failed')">
                                <i class="fas fa-times"></i> ငြင်းပယ်ရန်
                            </button>
                        `
                            : ""
                        }
                    </td>
                `
        transactionsTableBody.appendChild(row)
      })
    } else {
      transactionsTableBody.innerHTML = '<tr><td colspan="8" class="no-data">ငွေလွှဲမှတ်တမ်း မရှိပါ</td></tr>'
    }
  } catch (error) {
    console.error("Error loading transactions:", error)
    showAdminMessage("ငွေလွှဲမှတ်တမ်းများ ရယူရာတွင် အမှားဖြစ်ပွားခဲ့သည်", "error")
  }
}

function filterTransactions() {
  const typeFilter = document.getElementById("transactionTypeFilter").value
  const statusFilter = document.getElementById("transactionStatusFilter").value
  const dateFilter = document.getElementById("transactionDateFilter").value
  const rows = document.querySelectorAll("#transactionsTableBody tr")

  rows.forEach((row) => {
    const typeMatch = !typeFilter || row.dataset.type === typeFilter
    const statusMatch = !statusFilter || row.dataset.status === statusFilter
    const dateMatch = !dateFilter || row.dataset.date === dateFilter

    if (typeMatch && statusMatch && dateMatch) {
      row.style.display = ""
    } else {
      row.style.display = "none"
    }
  })
}

async function updateTransactionStatus(txId, status) {
  try {
    // Update transaction status
    const { error: updateError } = await supabase.from("transactions").update({ status }).eq("id", txId)

    if (updateError) throw updateError

    // Get transaction details
    const { data: tx, error: txError } = await supabase.from("transactions").select("*").eq("id", txId).single()

    if (txError) throw txError

    // If transaction is approved and it's a deposit or withdrawal, update wallet balance
    if (status === "completed" && (tx.transaction_type === "deposit" || tx.transaction_type === "withdrawal")) {
      const userId = tx.transaction_type === "deposit" ? tx.to_user_id : tx.from_user_id
      const { data: wallet, error: walletError } = await supabase
        .from("wallets")
        .select("balance")
        .eq("user_id", userId)
        .eq("currency", tx.currency)
        .single()

      if (walletError) throw walletError

      let newBalance = Number(wallet.balance)
      if (tx.transaction_type === "deposit") {
        newBalance += Number(tx.amount)
      } else {
        newBalance -= Number(tx.amount)
      }

      const { error: updateWalletError } = await supabase
        .from("wallets")
        .update({ balance: newBalance })
        .eq("user_id", userId)
        .eq("currency", tx.currency)

      if (updateWalletError) throw updateWalletError
    }

    // Log admin action
    await logAdminAction("transaction_update", tx.from_user_id || tx.to_user_id, {
      transaction_id: txId,
      status: status,
      type: tx.transaction_type,
    })

    showAdminMessage("ငွေလွှဲမှု အခြေအနေ အပ်ဒိတ် အောင်မြင်ပါသည်", "success")
    loadTransactions()
  } catch (error) {
    console.error("Error updating transaction status:", error)
    showAdminMessage("ငွေလွှဲမှု အခြေအနေ အပ်ဒိတ်လုပ်ရာတွင် အမှားဖြစ်ပွားခဲ့သည်", "error")
  }
}

// KYC Management
async function loadKYCRequests() {
  try {
    const { data: pendingKYC, error: pendingError } = await supabase
      .from("users")
      .select("*")
      .eq("kyc_status", "pending")

    if (pendingError) throw pendingError

    const { data: approvedKYC, error: approvedError } = await supabase
      .from("users")
      .select("*")
      .eq("kyc_status", "approved")

    if (approvedError) throw approvedError

    const { data: rejectedKYC, error: rejectedError } = await supabase
      .from("users")
      .select("*")
      .eq("kyc_status", "rejected")

    if (rejectedError) throw rejectedError

    // Update KYC stats
    document.getElementById("pendingKYCCount").textContent = pendingKYC ? pendingKYC.length : 0
    document.getElementById("approvedKYCCount").textContent = approvedKYC ? approvedKYC.length : 0
    document.getElementById("rejectedKYCCount").textContent = rejectedKYC ? rejectedKYC.length : 0

    // Display pending KYC requests
    const kycRequests = document.getElementById("kycRequests")
    kycRequests.innerHTML = ""

    if (pendingKYC && pendingKYC.length > 0) {
      pendingKYC.forEach((user) => {
        const kycRequest = document.createElement("div")
        kycRequest.className = "kyc-request"
        kycRequest.innerHTML = `
                    <div class="kyc-user-info">
                        <h4>${user.full_name}</h4>
                        <p>Email: ${user.email}</p>
                        <p>ဖုန်းနံပါတ်: ${user.phone || "N/A"}</p>
                        <p>နိုင်ငံ: ${user.country || "N/A"}</p>
                        <p>တင်သွင်းသည့်ရက်: ${formatDate(user.created_at)}</p>
                    </div>
                    <div class="kyc-document">
                        ${
                          user.kyc_document_url
                            ? `<img src="${SUPABASE_URL}/storage/v1/object/public/kyc-documents/${user.kyc_document_url}" alt="KYC Document" />`
                            : "<p>စာရွက်စာတမ်း မရှိပါ</p>"
                        }
                    </div>
                    <div class="kyc-actions">
                        <button class="action-btn approve" onclick="updateKYCStatus('${user.id}', 'approved')">
                            <i class="fas fa-check"></i> အတည်ပြုရန်
                        </button>
                        <button class="action-btn reject" onclick="updateKYCStatus('${user.id}', 'rejected')">
                            <i class="fas fa-times"></i> ငြင်းပယ်ရန်
                        </button>
                    </div>
                `
        kycRequests.appendChild(kycRequest)
      })
    } else {
      kycRequests.innerHTML = '<div class="no-kyc">စောင့်ဆိုင်းနေသော KYC တောင်းဆိုမှုများ မရှိပါ</div>'
    }
  } catch (error) {
    console.error("Error loading KYC requests:", error)
    showAdminMessage("KYC တောင်းဆိုမှုများ ရယူရာတွင် အမှားဖြစ်ပွားခဲ့သည်", "error")
  }
}

async function updateKYCStatus(userId, status) {
  try {
    const { error } = await supabase.from("users").update({ kyc_status: status }).eq("id", userId)

    if (error) throw error

    // Log admin action
    await logAdminAction("kyc_update", userId, {
      status: status,
      message: `KYC status updated to ${status}`,
    })

    showAdminMessage(`KYC အခြေအနေ ${status === "approved" ? "အတည်ပြု" : "ငြင်းပယ်"} အောင်မြင်ပါသည်`, "success")
    loadKYCRequests()
  } catch (error) {
    console.error("Error updating KYC status:", error)
    showAdminMessage("KYC အခြေအနေ အပ်ဒိတ်လုပ်ရာတွင် အမှားဖြစ်ပွားခဲ့သည်", "error")
  }
}

// Market Management
async function loadMarketData() {
  try {
    const { data: marketData, error } = await supabase.from("market_data").select("*").order("symbol")

    if (error) throw error

    const marketDataTableBody = document.getElementById("marketDataTableBody")
    marketDataTableBody.innerHTML = ""

    if (marketData && marketData.length > 0) {
      marketData.forEach((coin) => {
        const changeClass = coin.price_change_24h >= 0 ? "positive" : "negative"
        const changeSymbol = coin.price_change_24h >= 0 ? "+" : ""

        const row = document.createElement("tr")
        row.innerHTML = `
                    <td>${coin.symbol}</td>
                    <td>$${formatNumber(coin.price_usd)}</td>
                    <td class="${changeClass}">${changeSymbol}${coin.price_change_24h}%</td>
                    <td>$${formatNumber(coin.volume_24h)}</td>
                    <td>${formatDate(coin.last_updated)}</td>
                `
        marketDataTableBody.appendChild(row)
      })
    } else {
      marketDataTableBody.innerHTML = '<tr><td colspan="5" class="no-data">စျေးကွက်ဒေတာ မရှိပါ</td></tr>'
    }
  } catch (error) {
    console.error("Error loading market data:", error)
    showAdminMessage("စျေးကွက်ဒေတာ ရယူရာတွင် အမှားဖြစ်ပွားခဲ့သည်", "error")
  }
}

async function updateAllPrices() {
  try {
    // Simulate market price updates
    const { data: marketData, error } = await supabase.from("market_data").select("*")

    if (error) throw error

    for (const coin of marketData) {
      const change = (Math.random() - 0.5) * 0.1 // ±5% max change
      const newPrice = Number(coin.price_usd) * (1 + change)
      const priceChange24h = (Math.random() - 0.5) * 10 // ±5% change

      await supabase
        .from("market_data")
        .update({
          price_usd: newPrice,
          price_change_24h: priceChange24h,
          last_updated: new Date().toISOString(),
        })
        .eq("symbol", coin.symbol)
    }

    // Log admin action
    await logAdminAction("market_update_all", null, {
      message: "All market prices updated",
    })

    showAdminMessage("စျေးနှုန်းများ အပ်ဒိတ် အောင်မြင်ပါသည်", "success")
    loadMarketData()
  } catch (error) {
    console.error("Error updating prices:", error)
    showAdminMessage("စျေးနှုန်းများ အပ်ဒိတ်လုပ်ရာတွင် အမှားဖြစ်ပွားခဲ့သည်", "error")
  }
}

async function updateSinglePrice() {
  const symbol = document.getElementById("coinSelect").value
  const newPrice = Number.parseFloat(document.getElementById("newPrice").value)

  if (!symbol || !newPrice || newPrice <= 0) {
    showAdminMessage("ကျေးဇူးပြု၍ လိုအပ်သော အချက်လက်များကို ဖြည့်သွင်းပါ", "error")
    return
  }

  try {
    const { data: oldData, error: getError } = await supabase
      .from("market_data")
      .select("price_usd")
      .eq("symbol", symbol)
      .single()

    if (getError) throw getError

    const oldPrice = Number(oldData.price_usd)
    const priceChange = ((newPrice - oldPrice) / oldPrice) * 100

    const { error: updateError } = await supabase
      .from("market_data")
      .update({
        price_usd: newPrice,
        price_change_24h: priceChange,
        last_updated: new Date().toISOString(),
      })
      .eq("symbol", symbol)

    if (updateError) throw updateError

    // Log admin action
    await logAdminAction("market_update_single", null, {
      symbol: symbol,
      old_price: oldPrice,
      new_price: newPrice,
    })

    showAdminMessage(`${symbol} စျေးနှုန်း အပ်ဒိတ် အောင်မြင်ပါသည်`, "success")
    loadMarketData()
  } catch (error) {
    console.error("Error updating price:", error)
    showAdminMessage("စျေးနှုန်း အပ်ဒိတ်လုပ်ရာတွင် အမှားဖြစ်ပွားခဲ့သည်", "error")
  }
}

// Admin Logs
async function loadAdminLogs() {
  try {
    const { data: logs, error } = await supabase
      .from("admin_logs")
      .select("*")
      .order("created_at", { ascending: false })

    if (error) throw error

    const adminLogs = document.getElementById("adminLogs")
    adminLogs.innerHTML = ""

    if (logs && logs.length > 0) {
      logs.forEach((log) => {
        const logItem = document.createElement("div")
        logItem.className = "log-item"
        logItem.dataset.action = log.action
        logItem.dataset.date = new Date(log.created_at).toISOString().split("T")[0]

        logItem.innerHTML = `
                    <div class="log-icon">
                        <i class="fas ${getActionIcon(log.action)}"></i>
                    </div>
                    <div class="log-details">
                        <h4>${getActionTitle(log.action)}</h4>
                        <p>${log.admin_email} - ${JSON.stringify(log.details || {})}</p>
                    </div>
                    <div class="log-time">
                        ${formatDate(log.created_at)}
                    </div>
                `
        adminLogs.appendChild(logItem)
      })
    } else {
      adminLogs.innerHTML = '<div class="no-logs">လုပ်ဆောင်ချက်မှတ်တမ်း မရှိပါ</div>'
    }
  } catch (error) {
    console.error("Error loading admin logs:", error)
    showAdminMessage("လုပ်ဆောင်ချက်မှတ်တမ်းများ ရယူရာတွင် အမှားဖြစ်ပွားခဲ့သည်", "error")
  }
}

function filterLogs() {
  const dateFilter = document.getElementById("logDateFilter").value
  const actionFilter = document.getElementById("logActionFilter").value
  const logs = document.querySelectorAll("#adminLogs .log-item")

  logs.forEach((log) => {
    const dateMatch = !dateFilter || log.dataset.date === dateFilter
    const actionMatch = !actionFilter || log.dataset.action === actionFilter

    if (dateMatch && actionMatch) {
      log.style.display = ""
    } else {
      log.style.display = "none"
    }
  })
}

// Utility Functions
async function logAdminAction(action, targetUserId, details) {
  try {
    await supabase.from("admin_logs").insert([
      {
        admin_email: ADMIN_EMAIL,
        action: action,
        target_user_id: targetUserId,
        details: details,
      },
    ])
  } catch (error) {
    console.error("Error logging admin action:", error)
  }
}

function formatNumber(num) {
  if (num >= 1000000000) {
    return (num / 1000000000).toFixed(2) + "B"
  } else if (num >= 1000000) {
    return (num / 1000000).toFixed(2) + "M"
  } else if (num >= 1000) {
    return (num / 1000).toFixed(2) + "K"
  } else {
    return Number.parseFloat(num)
      .toFixed(8)
      .replace(/\.?0+$/, "")
  }
}

function formatDate(dateString) {
  const date = new Date(dateString)
  return date.toLocaleDateString("my-MM", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

function formatTimeAgo(dateString) {
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now - date
  const diffSec = Math.floor(diffMs / 1000)
  const diffMin = Math.floor(diffSec / 60)
  const diffHour = Math.floor(diffMin / 60)
  const diffDay = Math.floor(diffHour / 24)

  if (diffDay > 0) {
    return `${diffDay} ရက်အကြာက`
  } else if (diffHour > 0) {
    return `${diffHour} နာရီအကြာက`
  } else if (diffMin > 0) {
    return `${diffMin} မိနစ်အကြာက`
  } else {
    return "ယခုအတွင်း"
  }
}

function getKYCStatusText(status) {
  const statusTexts = {
    pending: "စောင့်ဆိုင်းနေသည်",
    approved: "အတည်ပြုပြီး",
    rejected: "ငြင်းပယ်ပြီး",
  }
  return statusTexts[status] || status
}

function getTransactionTitle(type) {
  const titles = {
    deposit: "ငွေသွင်း",
    withdrawal: "ငွေထုတ်",
    transfer: "ငွေလွှဲ",
    trade: "ကုန်သွယ်မှု",
  }
  return titles[type] || type
}

function getStatusText(status) {
  const statusTexts = {
    pending: "စောင့်ဆိုင်းနေသည်",
    completed: "ပြီးမြောက်သည်",
    failed: "မအောင်မြင်",
    cancelled: "ပယ်ဖျက်သည်",
  }
  return statusTexts[status] || status
}

function getActionIcon(action) {
  const icons = {
    admin_login: "sign-in-alt",
    kyc_update: "id-card",
    transaction_update: "exchange-alt",
    wallet_update: "wallet",
    market_update_all: "chart-line",
    market_update_single: "chart-bar",
  }
  return icons[action] || "cog"
}

function getActionTitle(action) {
  const titles = {
    admin_login: "အကောင့်ဝင်ရောက်မှု",
    kyc_update: "KYC အခြေအနေ အပ်ဒိတ်",
    transaction_update: "ငွေလွှဲမှု အခြေအနေ အပ်ဒိတ်",
    wallet_update: "ပိုက်ဆံအိတ် အပ်ဒိတ်",
    market_update_all: "စျေးနှုန်းများ အပ်ဒိတ်",
    market_update_single: "စျေးနှုန်း အပ်ဒိတ်",
  }
  return titles[action] || action
}

function generateTransactionHash() {
  return "tx_" + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)
}

function showAdminMessage(message, type = "info") {
  const messageElement = document.createElement("div")
  messageElement.className = `admin-message ${type}`
  messageElement.textContent = message

  document.body.appendChild(messageElement)

  setTimeout(() => {
    messageElement.remove()
  }, 5000)
}
