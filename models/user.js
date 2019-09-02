'use strict';
const util = require('util');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');

const SCRYPT_SALT_SIZE = 10;
const SCRYPT_ROUNDS = 8;
const SCRYPT_MEM_COST = 14;

const randomBytes = util.promisify(crypto.randomBytes);
const scrypt = util.promisify(crypto.scrypt);

const jwtSign = util.promisify(jwt.sign);

module.exports = (sequelize, Sequelize) => {
    const model = sequelize.define(
        'User',
        {
            email: {type: Sequelize.STRING, allowNull: false, validate: {isEmail: true}},
            password: Sequelize.VIRTUAL,
            digest: Sequelize.STRING,
            salt: Sequelize.STRING,
            role: {type: Sequelize.ENUM('NORMAL', 'ADMIN'), defaultValue: 'NORMAL'},
            loggedOutAt: Sequelize.DATE,
            active: {type: Sequelize.BOOLEAN, defaultValue: true},
        },
        {
            hooks: {
                async beforeCreate(user) {
                    if (user.password) {
                        user.set('salt', (await randomBytes(SCRYPT_SALT_SIZE)).toString('base64'));
                        user.set('digest', await user.calculateDigest(user.password));
                    }
                },
                async beforeUpdate(user) {
                    if (user.password) {
                        user.set('salt', (await randomBytes(SCRYPT_SALT_SIZE)).toString('base64'));
                        user.set('digest', await user.calculateDigest(user.password));
                    }
                },
            },
            indexes: [{fields: ['email'], unique: true, using: 'HASH'}, {fields: ['active']}],
        }
    );

    model.prototype.calculateDigest = async function(password) {
        const cipher = crypto.createCipheriv(
            'aes-256-ctr',
            await scrypt(
                password,
                Buffer.concat([Buffer.from(this.salt, 'base64'), Buffer.from(process.env.SALT_SEPARATOR, 'base64')]),
                32,
                {
                    N: 1 << SCRYPT_MEM_COST,
                    p: 1,
                    r: SCRYPT_ROUNDS,
                }
            ),
            Buffer.alloc(16, 0)
        );
        return cipher.update(process.env.SIGNER_KEY, 'base64', 'base64') + cipher.final('base64');
    };

    model.prototype.authenticate = async function(password) {
        return this.digest === (await this.calculateDigest(String(password)));
    };

    model.prototype.jwt = async function(data = {}, {expiry: expiresIn} = {}) {
        return await jwtSign({...data, id: this.id}, process.env.JWT_SECRET, {
            noTimestamp: true,
            ...(expiresIn ? {expiresIn} : {}),
        });
    };

    model.associate = function() {};
};
