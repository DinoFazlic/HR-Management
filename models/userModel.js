const pool = require('../config/db');
const bcrypt = require('bcrypt');


const User = {
    // Create a new user in the database
    create: async (first_name, last_name, email, password, role) => {
        //console.log('Role Received in Model:', role); 

        const query = `
                        INSERT INTO users (first_name, last_name, email, password, role)
                        VALUES ($1, $2, $3, $4, $5) RETURNING *;
                    `;
        const values = [first_name, last_name, email, password, role];
        const result = await pool.query(query, values);
        return result.rows[0];
    },

    // Find a user by their email
    findByEmail: async (email) => {
        const query = `SELECT * FROM users WHERE email = $1;`;
        const result = await pool.query(query, [email]);
        return result.rows[0];
    },

    // Get all users from the database
    getAllUsers: async () => {
        const query = 'SELECT id, first_name, last_name, email, role, created_at FROM users;';
        const result = await pool.query(query);
        return result.rows;
    },

    // Delete a user by their ID
    deleteUserById: async (id) => {
        const query = 'DELETE FROM users WHERE id = $1 RETURNING *;';
        const values = [id];
        const result = await pool.query(query, values);
        return result.rows[0];
    },

    // Update a user's role by their ID
    updateUserRole: async (id, role) => {
        const query = 'UPDATE users SET role = $1 WHERE id = $2 RETURNING *;';
        const values = [role, id];
        const result = await pool.query(query, values);
        return result.rows[0];
    },

    // Save a password reset token and its expiration for a user
    saveResetToken: async (userId, token, expires) => {
        const query = `
            UPDATE users
            SET password_reset_token = $1, password_reset_expires = $2
            WHERE id = $3
        `;
        const values = [token, expires, userId];
        await pool.query(query, values);
    },


    findByResetToken: async (token) => {
        const query = `SELECT * FROM users WHERE password_reset_token IS NOT NULL;`;
        const result = await pool.query(query);
    
        
        for (const user of result.rows) {
            const isValid = await bcrypt.compare(token, user.password_reset_token);
            if (isValid) {
                return user; 
            }
        }
    
        return null; 
    },
    

    // Update a user's password and clear the reset token and expiration
    updatePassword: async (id, password) => {
        const query = `
            UPDATE users
            SET password = $1, password_reset_token = NULL, password_reset_expires = NULL
            WHERE id = $2;
        `;
        const values = [password, id];
        await pool.query(query, values);
    },


};

module.exports = User;
