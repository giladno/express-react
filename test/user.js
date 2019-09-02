'use strict';

describe('user', function() {
    it('register', async function() {
        const email = 'test@novik.ca';
        const res = await chai
            .request(app)
            .post('/api/register')
            .send({email, password: 'password'});
        res.should.have.status(201);
        expect(await User.findOne({where: {email}, attributes: ['email', 'role'], raw: true})).to.deep.equal({
            email,
            role: 'NORMAL',
        });
    });
    it('register duplicated', async function() {
        const res = await chai
            .request(app)
            .post('/api/register')
            .send({email: 'gilad@novik.ca', password: 'password'});
        res.should.have.status(409);
    });
    it('register invalid email', async function() {
        const res = await chai
            .request(app)
            .post('/api/register')
            .send({email: 'email', password: 'password'});
        res.should.have.status(400);
    });
    it('login', async function() {
        const res = await chai
            .request(app)
            .post('/api/login')
            .send({email: 'gilad@novik.ca', password: 'password'});
        res.body.should.have.property('token');
    });
    it('login invalid email', async function() {
        const res = await chai
            .request(app)
            .post('/api/login')
            .send({email: 'email', password: 'password'});
        res.should.have.status(401);
    });
    it('login invalid password', async function() {
        const res = await chai
            .request(app)
            .post('/api/login')
            .send({email: 'gilad@novik.ca', password: 'invalid'});
        res.should.have.status(401);
    });
    it('me', async function() {
        const res = await chai
            .request(app)
            .get('/api/me')
            .set('x-email', 'gilad@novik.ca');
        res.body.should.be.deep.equal({
            email: 'gilad@novik.ca',
            role: 'ADMIN',
        });
    });
});
