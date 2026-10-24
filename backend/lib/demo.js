const isDemoUser = (userId) => {
  const id = Number(process.env.DEMO_USER_ID)
  return Number.isInteger(id) && id > 0 && userId === id
}

const demoForbidden = (res) =>
  res.status(403).json({
    message: 'This action is disabled for the demo account.',
    code: 'DEMO_ACCOUNT',
  })

module.exports = { isDemoUser, demoForbidden }