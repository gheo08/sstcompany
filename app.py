from flask import Flask, flash, render_template, request, jsonify, redirect, url_for, session, send_from_directory
import sqlite3, os

app = Flask(__name__)
app.secret_key = "super_secret_key_123"
UPLOAD_FOLDER = 'static/images'
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER


# --- Database Path ---
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DB_PATH = os.path.join(BASE_DIR, "ecommerce_project", "ecommerce.db")

# --- DB connection helper ---
def get_db_connection():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

# --- Utility: Get all products ---
def get_all_products():
    conn = get_db_connection()
    products = conn.execute("SELECT * FROM products").fetchall()
    conn.close()
    return products


# ==============================
# 🔹 USER AUTHENTICATION
# ==============================
@app.route('/')
def home():
    return redirect(url_for('signup'))


@app.route('/signup', methods=['GET', 'POST'])
def signup():
    if request.method == 'GET':
        return render_template('signup.html')

    data = request.get_json() or {}
    email = data.get('email')
    password = data.get('password')

    if not email or not password:
        return jsonify({"message": "Email and password are required!"}), 400

    conn = get_db_connection()
    cur = conn.cursor()
    cur.execute("SELECT * FROM users WHERE email = ?", (email,))
    existing_user = cur.fetchone()

    if existing_user:
        conn.close()
        return jsonify({"message": "Email already exists!"}), 400

    conn.execute(
            "INSERT INTO users (email, password, role, registered_on) VALUES (?, ?, ?, CURRENT_TIMESTAMP)",
            (email, password, 'user')
        )
    
    conn.commit()
    conn.close()

    return jsonify({"message": "Account created successfully!"}), 201


@app.route('/login', methods=['GET', 'POST'])
def login():
    if request.method == 'GET':
        return render_template('login.html')

    data = request.get_json() or {}
    email = data.get('email')
    password = data.get('password')

    conn = get_db_connection()
    cur = conn.cursor()
    cur.execute("SELECT * FROM users WHERE email = ?", (email,))
    user = cur.fetchone()
    conn.close()

    if not user:
        return jsonify({"message": "User not found"}), 404
    if user["password"] != password:
        return jsonify({"message": "Incorrect password"}), 401

    session['user_id'] = user["id"]
    session['user_email'] = user["email"]
    session['user_role'] = user["role"]

    if user["role"] == "admin":
        return jsonify({"message": "Admin login successful!", "redirect": "/admindashboard"}), 200
    return jsonify({"message": "User login successful!", "redirect": "/dashboard"}), 200


@app.route('/logout')
def logout():
    session.clear()
    return redirect(url_for('login'))


# ==============================
# 🔹 DASHBOARD & PRODUCT LIST
# ==============================
@app.route('/dashboard', methods=['GET', 'POST'])
def dashboard():
    user_email = session.get('user_email')

    conn = get_db_connection()
    cursor = conn.cursor()

    # Get parameters from URL or form
    search_query = request.args.get('search', '').strip()
    category = request.args.get('category', '').strip()
    brand = request.args.get('brand', '').strip()  # brand filter (optional)

    # Base SQL and parameters
    sql = "SELECT * FROM products WHERE 1=1"
    params = []

    # Apply category filter if provided
    if category and category.lower() != 'all':
        sql += " AND LOWER(category) = ?"
        params.append(category.lower())

    # Apply brand filter if provided
    if brand:
        sql += " AND LOWER(brand) = ?"
        params.append(brand.lower())

    # Apply search filter if provided
    if search_query:
        sql += " AND LOWER(name) LIKE ?"
        params.append(f"%{search_query.lower()}%")

    # Execute the dynamic SQL query
    cursor.execute(sql, params)
    products = cursor.fetchall()

    # Convert sqlite3.Row to dictionaries
    products_list = [dict(row) for row in products]

    conn.close()

    return render_template('dashboard.html', products=products_list, user_email=user_email)

@app.route("/api/product/<int:id>")
def get_product(id):
    conn = get_db_connection()
    p = conn.execute(
        "SELECT * FROM products WHERE id = ?", (id,)
    ).fetchone()
    conn.close()

    if not p:
        return jsonify({"error": "not found"}), 404

    return jsonify({
        "id": p["id"],
        "name": p["name"],
        "brand": p["brand"],
        "category": p["category"],
        "price": p["price"],
        "stock": p["stock"],
        "description": p["description"],
        "image": p["image"]  # MUST exist in your DB
    })



# ==============================
# 🔹 ADD TO CART / VIEW CART
# ==============================
@app.route('/add_to_cart/<int:product_id>', methods=['POST'])
def add_to_cart(product_id):
    user_id = session.get('user_id')
    if not user_id:
        return redirect(url_for('login'))

    quantity = int(request.form.get('quantity', 1))
    conn = get_db_connection()
    cur = conn.cursor()

    cur.execute("SELECT * FROM cart WHERE user_id = ? AND product_id = ?", (user_id, product_id))
    existing = cur.fetchone()

    if existing:
        cur.execute("UPDATE cart SET quantity = quantity + ? WHERE user_id = ? AND product_id = ?", (quantity, user_id, product_id))
    else:
        cur.execute("INSERT INTO cart (user_id, product_id, quantity) VALUES (?, ?, ?)", (user_id, product_id, quantity))

    conn.commit()
    conn.close()
    return redirect(url_for('view_cart'))


@app.route('/cart')
@app.route('/cart')
def view_cart():
    conn = get_db_connection()
    cart_items = conn.execute("""
        SELECT 
            c.cart_id,
            p.id AS product_id,
            p.name AS product_name,
            p.brand,
            p.category,
            p.price,
            c.quantity,
            (p.price * c.quantity) AS total_price
        FROM cart c
        JOIN products p ON c.product_id = p.id
    """).fetchall()
    conn.close()
    return render_template('cart.html', cart_items=cart_items)



# ==============================
# 🔹 CHECKOUT & ORDER HISTORY
# ==============================
@app.route("/checkout", methods=["POST"])
def checkout():
    if "user_email" not in session:
        return jsonify({"error": "Login required"}), 403

    user_email = session["user_email"]
    print(f"🧾 Checkout triggered by: {user_email}")

    cart_items = request.get_json()
    print("🛒 Cart items received:", cart_items)  # Debug print

    conn = get_db_connection()

    user = conn.execute("SELECT id FROM users WHERE email = ?", (user_email,)).fetchone()
    if not user:
        conn.close()
        return jsonify({"error": "User not found"}), 404

    user_id = user["id"]

    for item in cart_items:
        product = conn.execute("SELECT stock, price FROM products WHERE id = ?", (item["id"],)).fetchone()

        if not product or product["stock"] < item["quantity"]:
            conn.close()
            return jsonify({"error": f"Insufficient stock for {item['name']}"}), 400

        total = product["price"] * item["quantity"]

        conn.execute("""
            INSERT INTO orders (user_id, product_id, quantity, total_price, status, order_date)
            VALUES (?, ?, ?, ?, 'Pending', datetime('now'))
        """, (user_id, item["id"], item["quantity"], total))

        conn.execute("UPDATE products SET stock = stock - ? WHERE id = ?", (item["quantity"], item["id"]))

    conn.commit()
    conn.close()

    return jsonify({"message": f"Order placed successfully by {user_email}"})






@app.route('/history')
def view_history():
    user_id = session.get('user_id')
    if not user_id:
        return redirect(url_for('login'))

    conn = get_db_connection()
    rows = conn.execute("""
        SELECT 
            o.order_id, 
            o.order_date, 
            o.quantity, 
            o.total_price, 
            o.status, 
            p.name
        FROM orders o
        JOIN products p ON o.product_id = p.id
        WHERE o.user_id = ?
        ORDER BY o.order_date DESC
    """, (user_id,)).fetchall()
    conn.close()

    # ✅ Clean and convert total_price to a real number
    orders = []
    for row in rows:
        try:
            price_str = str(row['total_price']).replace('₱', '').replace(',', '').strip()
            total_price = float(price_str)
        except (ValueError, TypeError):
            total_price = 0.0

        orders.append({
            'order_id': row['order_id'],
            'order_date': row['order_date'],
            'quantity': int(row['quantity']),
            'total_price': total_price,
            'status': row['status'],
            'name': row['name']
        })

    return render_template('history.html', orders=orders)







@app.route('/receipt/<int:order_id>')
def view_receipt(order_id):
    user_id = session.get('user_id')
    if not user_id:
        return redirect(url_for('login'))

    conn = get_db_connection()

    # Get the order_date first for the given order_id
    order_info = conn.execute("""
        SELECT order_date
        FROM orders
        WHERE order_id = ? AND user_id = ?
    """, (order_id, user_id)).fetchone()

    if not order_info:
        conn.close()
        return "Receipt not found or unauthorized", 404

    order_date = order_info["order_date"]

    # Get all orders from that same checkout session (same order_date)
    orders = conn.execute("""
        SELECT o.order_id, p.name AS product_name, o.quantity, o.total_price, o.status, o.order_date
        FROM orders o
        JOIN products p ON o.product_id = p.id
        WHERE o.user_id = ? AND o.order_date = ?
    """, (user_id, order_date)).fetchall()

    conn.close()

    # Calculate overall total
    overall_total = sum(order["total_price"] for order in orders)

    return render_template("receipt.html", orders=orders, overall_total=overall_total)



# ==============================
# 🔹 UPDATE PASSWORD
# ==============================
@app.route('/updatepass', methods=['GET', 'POST'])
def update_password():
    if 'user_email' not in session:
        return redirect(url_for('login'))

    email = session['user_email']

    if request.method == 'GET':
        # Render the update password page
        return render_template('updatepass.html', user_email=email)

    # POST request: handle password update
    data = request.get_json() or {}
    current_password = data.get('currentPassword')
    new_password = data.get('newPassword')

    if not current_password or not new_password:
        return jsonify({"success": False, "message": "All fields are required!"}), 400

    conn = get_db_connection()
    cur = conn.cursor()

    # Verify user exists
    cur.execute("SELECT * FROM users WHERE email = ?", (email,))
    user = cur.fetchone()
    if not user:
        conn.close()
        return jsonify({"success": False, "message": "User not found!"}), 404

    # Check current password
    if user["password"] != current_password:
        conn.close()
        return jsonify({"success": False, "message": "Current password is incorrect!"}), 401

    # Update password
    cur.execute("UPDATE users SET password = ? WHERE email = ?", (new_password, email))
    conn.commit()
    conn.close()

    return jsonify({"success": True, "message": "Password updated successfully!"})



# ==============================
# 🔹 ADMIN DASHBOARD
# ==============================
@app.route('/admindashboard')
def admin_dashboard():
    user_email = session.get('user_email')
    return render_template('admindashboard.html', user_email=user_email)



# ==============================
# Route for Manage Products
# ==============================

@app.route("/admin/add-product")
def add_product_page():
    return render_template("admin_newproducts.html")


@app.route('/admin/manage-products')
def manage_products():
    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute("SELECT * FROM products")
    rows = cursor.fetchall()
    conn.close()

    # Convert rows to dicts for Jinja template
    products = []
    for row in rows:
        products.append({
            "id": row["id"],
            "name": row["name"],
            "brand": row["brand"],
            "category": row["category"],
            "subcategory": row["subcategory"] if "subcategory" in row.keys() else "General",
            "stock": row["stock"],
            "description": row["description"],
            "image": row["image"]
        })

    return render_template('admin_products.html', products=products)




@app.route("/api/add_stock", methods=["POST"])
def add_stock():
    data = request.get_json()
    product_id = data["id"]
    amount = int(data["amount"])

    conn = get_db_connection()

    # Get current stock
    product = conn.execute(
        "SELECT stock FROM products WHERE id = ?",
        (product_id,)
    ).fetchone()

    if not product:
        conn.close()
        return jsonify({"success": False, "error": "Product not found"})

    new_stock = product["stock"] + amount

    # Update DB
    conn.execute(
        "UPDATE products SET stock = ? WHERE id = ?",
        (new_stock, product_id)
    )
    conn.commit()
    conn.close()

    return jsonify({"success": True, "new_stock": new_stock})

@app.route("/api/delete_product", methods=["POST"])
def delete_product():
    data = request.get_json()
    product_id = data["id"]

    conn = get_db_connection()

    # Verify product exists
    product = conn.execute(
        "SELECT * FROM products WHERE id = ?",
        (product_id,)
    ).fetchone()

    if not product:
        conn.close()
        return jsonify({"success": False, "error": "Product not found"})

    # Delete from DB
    conn.execute("DELETE FROM products WHERE id = ?", (product_id,))
    conn.commit()
    conn.close()

    return jsonify({"success": True})

# ==============================
# Route for New Product
# ==============================
@app.route('/admin_newproducts', methods=['GET', 'POST'])
def admin_newproducts():
    if request.method == 'POST':
        name = request.form['name']
        brand = request.form['brand']
        category = request.form['category']
        price = request.form['price']
        stock = request.form['stock']
        description = request.form['description']
        image = request.files['image']

        if not (name and brand and category and price and stock and description and image):
            flash("All fields are required!")
            return redirect(request.url)

        # Save image
        image_path = os.path.join(app.config['UPLOAD_FOLDER'], image.filename)
        image.save(image_path)
        image_db_path = image.filename

        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("""
            INSERT INTO products (name, brand, category, price, stock, description, image)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        """, (name, brand, category, price, stock, description, image_db_path))
        conn.commit()
        conn.close()

        # Pass flag to template for JS confirmation
        return render_template('admin_newproducts.html', added=True)

    # Default GET
    return render_template('admin_newproducts.html', added=False)









# ==============================
# Route for Manage Users
# ==============================

@app.route('/admin/manage-users')
def manage_users():
    return render_template('admin_users.html')

# --- API to get all users ---
@app.route('/api/users')
def api_users():
    conn = get_db_connection()
    users = conn.execute("SELECT id, email, password, role, datetime(registered_on) as registered_on FROM users").fetchall()
    conn.close()
    users_list = [dict(user) for user in users]
    return jsonify(users_list)


@app.route('/api/delete-user/<int:user_id>', methods=['DELETE'])
def delete_user(user_id):
    conn = get_db_connection()
    # Get the user role first
    user = conn.execute("SELECT role FROM users WHERE id = ?", (user_id,)).fetchone()
    if not user:
        conn.close()
        return jsonify({"message": "User not found"}), 404

    if user['role'] == 'admin':
        conn.close()
        return jsonify({"message": "Cannot delete admin user"}), 403

    conn.execute("DELETE FROM users WHERE id = ?", (user_id,))
    conn.commit()
    conn.close()
    return jsonify({"message": "User deleted successfully"})


# ==============================
# Route for Orders
# ==============================

@app.route('/admin/orders')
def admin_orders():
    return render_template('admin_orders.html')


# API: get all pending orders grouped by order_date
@app.route('/api/orders')
def api_orders():
    try:
        conn = get_db_connection()
        conn.row_factory = sqlite3.Row  # allows accessing columns by name
        rows = conn.execute("""
            SELECT o.order_id, o.user_id, u.email AS user_email,
                   o.product_id, p.name AS product_name,
                   o.quantity, o.total_price, o.status, o.order_date
            FROM orders o
            JOIN products p ON o.product_id = p.id
            JOIN users u ON o.user_id = u.id
            WHERE LOWER(o.status) = 'pending'
            ORDER BY o.order_date DESC, o.order_id ASC
        """).fetchall()
        conn.close()

        if not rows:
            return jsonify({})

        orders_by_date = {}
        for row in rows:
            date = str(row['order_date'])
            if date not in orders_by_date:
                orders_by_date[date] = {"orders": [], "status": row["status"]}

            orders_by_date[date]["orders"].append({
                "order_id": row["order_id"],
                "user_email": row["user_email"],   # get email from users table
                "product_name": row["product_name"],  # get name from products table
                "quantity": row["quantity"],
                "total_price": row["total_price"]
            })

            orders_by_date[date]["overall_price"] = orders_by_date[date].get("overall_price", 0) + row["total_price"]

        return jsonify(orders_by_date)

    except Exception as e:
        print("Error retrieving orders:", e)
        return jsonify({"error": str(e)})


# API: complete order by order_id
@app.route("/api/orders/<int:oid>/complete", methods=["POST"])
def complete_order_by_id(oid):
    conn = get_db_connection()
    conn.execute("UPDATE orders SET status='completed' WHERE order_id = ?", (oid,))
    conn.commit()
    conn.close()
    return jsonify({"message": "Order completed successfully!"})

@app.route("/api/orders/complete_group", methods=["POST"])
def complete_order_group():
    data = request.get_json()
    order_date = data.get("order_date")

    if not order_date:
        return jsonify({"error": "Missing order_date"}), 400

    conn = get_db_connection()
    conn.execute("""
        UPDATE orders 
        SET status='completed' 
        WHERE order_date = ?
    """, (order_date,))
    conn.commit()
    conn.close()

    return jsonify({"message": "Order group completed!"})



# ==============================
#  admin_completeorder
# ==============================

@app.route("/admin_completeorder")
def admin_completeorder():
    return render_template("admin_completeorder.html")

# API: get all completed orders grouped by order_date
@app.route('/api/completed_orders')
def api_completed_orders():
    try:
        conn = get_db_connection()
        conn.row_factory = sqlite3.Row
        rows = conn.execute("""
            SELECT o.order_id, o.user_id, u.email AS user_email,
                o.product_id, p.name AS product_name,
                o.quantity, o.total_price, o.status, o.order_date
            FROM orders o
            JOIN products p ON o.product_id = p.id
            JOIN users u ON o.user_id = u.id
            WHERE LOWER(o.status) = 'completed'
            ORDER BY o.order_date DESC, o.order_id ASC
        """).fetchall()
        conn.close()

        # Process rows
        completed_orders_by_date = {}
        for row in rows:
            date = str(row['order_date'])
            if date not in completed_orders_by_date:
                completed_orders_by_date[date] = {"orders": [], "status": row["status"], "overall_price": 0.0}

            completed_orders_by_date[date]["orders"].append({
                "order_id": row["order_id"],
                "user_email": row["user_email"],
                "product_name": row["product_name"],
                "quantity": row["quantity"],
                "total_price": float(row["total_price"])  # ensure numeric
            })

            # Add to overall price
            completed_orders_by_date[date]["overall_price"] += float(row["total_price"])

        return jsonify(completed_orders_by_date)


    except Exception as e:
        print("Error retrieving completed orders:", e)
        return jsonify({"error": str(e)})





# ==============================
# 🔹 Serve JS from /function/
# ==============================
@app.route('/function/<path:filename>')
def function_static(filename):
    return send_from_directory('function', filename)




# ==============================
# 🔹 Run App
# ==============================
if __name__ == '__main__':
    app.run(debug=True)
