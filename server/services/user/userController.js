const db = require('../../config/db');
const { logAudit } = require('../../utils/logAudit');


const userObj = {
    getUserDetails: async (req, res) => {
        try {
            const { user_id, roleid } = req.user;
            const [user] = await db.query(`
                SELECT 
                  CONCAT(user_profiles.firstname, ' ', user_profiles.lastname) AS provider_name,
                  user_profiles.dob,
                  provider_practices.*,
                  pl.*
                FROM users
                LEFT JOIN user_profiles 
                  ON users.user_id = user_profiles.fk_userid
                LEFT JOIN provider_practices 
                  ON users.user_id = provider_practices.provider_id
                LEFT JOIN providerlocations pl 
                  ON pl.provider_id = users.user_id
                WHERE users.user_id = ?
                  AND users.fk_roleid = 6
              `, [user_id]);
            if (!user) {
                return res.status(404).json({ error: 'User not found' });
            }
            return res.json({
                success: true,
                data: user
            });
        } catch (error) {
            console.error(error);
            res.status(500).json({ error: 'Internal Server Error' });
        }
    }
}
module.exports = userObj; 