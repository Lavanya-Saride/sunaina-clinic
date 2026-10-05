import { login as loginUser, logout as logoutUser } from '../services/authService.js';
import { getPermissionsForRole } from '../config/permissions.js';
import { getBearerToken } from '../middleware/auth.js';

function withPermissions(user) {
  return { ...user, permissions: getPermissionsForRole(user.role) };
}

export async function login(req, res, next) {
  try {
    const { token, expiresAt, user } = await loginUser(req.body.email, req.body.password);

    return res.status(200).json({
      success: true,
      data: { token, expiresAt, user: withPermissions(user) },
    });
  } catch (error) {
    return next(error);
  }
}

export async function logout(req, res, next) {
  try {
    await logoutUser(getBearerToken(req));
    return res.status(200).json({ success: true, message: 'Signed out.' });
  } catch (error) {
    return next(error);
  }
}

export function me(req, res) {
  return res.status(200).json({
    success: true,
    data: { user: withPermissions(req.user), expiresAt: req.authSession.expiresAt },
  });
}
