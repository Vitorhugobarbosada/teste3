import dotenv from 'dotenv'; 
import {resolve} from 'path'; 
import OracleDB from 'oracledb';
import { Request, Response, RequestHandler } from 'express';

dotenv.config({ path: resolve('C:/workspace/outros/.env') });

export namespace walletHandler {
    
    // Rota para depósito de cartao de credito / adicionar fundos à carteira do usuário
    export const addFundsToWalletRoute: RequestHandler = async (req: Request, res: Response) => {
        const { userId: pUserId, amount: pAmount, cardNumber: pCardNumber, cardName: pCardName, 
            cardExpiration: pCardExpiration, cardCVV: pCardCVV} = req.body;

        // Função para validar número do cartão usando Regex
        const isValidCardNumber = (cardNumber: string) => {
            const visaRegex = /^4[0-9]{12}(?:[0-9]{3})?$/;
            const masterCardRegex = /^(5[1-5][0-9]{14}|2(2[2-9][0-9]{13}|[3-6][0-9]{14}|7[01][0-9]{13}|720[0-9]{12}))$/;
            return visaRegex.test(cardNumber) || masterCardRegex.test(cardNumber);
        };

        // Função para validar a data de expiração (MM/YY)
        const isValidExpirationDate = (expirationDate: string) => {
            const [year, month] = expirationDate.split('-').map(Number);
            if (!month || !year || month < 1 || month > 12) return false;
        
            const currentDate = new Date();
            const currentYear = currentDate.getFullYear();
            const currentMonth = currentDate.getMonth() + 1;
        
            return year > currentYear || (year === currentYear && month >= currentMonth);
        };        

        // Função para validar o CVV (deve ter 3 ou 4 dígitos)
        const isValidCVV = (cvv: string) => {
            return /^[0-9]{3,4}$/.test(cvv);
        };

        if (!pUserId || isNaN(pAmount) || pAmount <= 0 || !pCardName) {
            res.status(400).send("Parâmetros inválidos ou faltantes.");
            return;
        }

        if (!pCardNumber || !isValidCardNumber(pCardNumber)) {
            res.status(400).send("Número do cartão de crédito inválido.");
            return;
        }

        if (!pCardExpiration || !isValidExpirationDate(pCardExpiration)) {
            res.status(400).send("Data de expiração do cartão inválida.");
            return;
        }

        if (!pCardCVV || !isValidCVV(pCardCVV)) {
            res.status(400).send("CVV do cartão inválido.");
            return;
        }

        let connection;
        try {
            connection = await OracleDB.getConnection({
                user: process.env.ORACLE_USER,
                password: process.env.ORACLE_PASSWORD,
                connectString: process.env.ORACLE_CONN_STR
            });

            await connection.execute(
                'UPDATE WALLETS SET BALANCE = BALANCE + :balance WHERE USER_ID = :user_id',
                [pAmount, pUserId],
                { autoCommit: true }
            );

            await connection.execute(
                'INSERT INTO TRANSACTIONS (TRANSACTION_ID, USER_ID, TYPE_, AMOUNT, DATE_) VALUES (SEQ_TRANSACTIONS.NEXTVAL, :email, :type, :amount, SYSDATE)',
                [pUserId, "credit_card", pAmount],
                { autoCommit: true }
            );
            
            res.status(200).send("Fundos adicionados com sucesso.");
        } catch (error) {
            console.error('Erro ao adicionar fundos na carteira.', error);
            res.status(500).send("Erro ao adicionar fundos na carteira.");
        } finally {
            if (connection) {
                await connection.close();
            }
        }

    };

    function calculateWithdrawalFee(amount: number): number {
        if (amount <= 100) {
            return amount * 0.04;
        } else if (amount <= 1000) {
            return amount * 0.03;
        } else if (amount <= 5000) {
            return amount * 0.02;
        } else if (amount <= 100000) {
            return amount * 0.01;
        } else {
            return 0;
        }
    }

    // Rota para sacar fundos da carteira do usuário
    export const withdrawFundsRoute: RequestHandler = async (req: Request, res: Response) => {
        const { userId: pUserId, amount: pAmount, transferType: pTransferType} = req.body;
        
        if (pUserId && !isNaN(pAmount) && pAmount > 0 ) {
            const fee = Number(calculateWithdrawalFee(pAmount));
            const totalAmount: number = Number(pAmount) + Number(fee);
    
            let connection;
            try {
                connection = await OracleDB.getConnection({
                    user: process.env.ORACLE_USER,
                    password: process.env.ORACLE_PASSWORD,
                    connectString: process.env.ORACLE_CONN_STR
                });

                const walletBalance: any = await connection.execute(
                    'SELECT BALANCE FROM WALLETS WHERE USER_ID = :user_id',
                    [pUserId],
                    { outFormat: OracleDB.OUT_FORMAT_OBJECT }
                );

                const balance = walletBalance.rows[0].BALANCE;

                if (balance >= totalAmount) {
                    const newBalance = balance - totalAmount;

                    await connection.execute(
                        'UPDATE WALLETS SET BALANCE = :balance WHERE USER_ID = :user_id',
                        [newBalance, pUserId],
                        { autoCommit: true }
                    );

                    await connection.execute(
                        'INSERT INTO TRANSACTIONS (TRANSACTION_ID, USER_ID, TYPE_, AMOUNT, DATE_) VALUES (SEQ_TRANSACTIONS.NEXTVAL, :email, :type, :amount, SYSDATE)',
                        [pUserId, pTransferType, totalAmount],
                        { autoCommit: true }
                    );

                    if (pTransferType === 'banco') {
                        res.status(200).send(`Saque via transferência bancária realizado.`);
                    } else if (pTransferType === 'pix') {
                        res.status(200).send(`Saque via PIX realizado.`);
                    }

                } else {
                    res.status(400).send("Saldo insuficiente.");
                }
    
            } catch (error) {
                console.error('Erro ao realizar saque:', error);
                res.status(500).send("Erro ao realizar saque.");
            } finally {
                if (connection) {
                    await connection.close();
                }
            }
        } else {
            res.status(400).send("Parâmetros inválidos ou faltantes.");
        }
    };
    
    // Rota para apostar em um evento
    export const betOnEventRoute: RequestHandler = async (req: Request, res: Response) => {
        const pUserId = req.get('userId');
        const pEventId = req.get('eventId');
        const pBetAmount = Number(req.get('betAmount'));
        const pBetTeam = req.get('team');
    
        if (pUserId && pEventId && !isNaN(pBetAmount) && pBetAmount > 0) {
            let connection;
            try {
                connection = await OracleDB.getConnection({
                    user: process.env.ORACLE_USER,
                    password: process.env.ORACLE_PASSWORD,
                    connectString: process.env.ORACLE_CONN_STR
                });

                const walletBalance: any = await connection.execute(
                    'SELECT BALANCE FROM WALLETS WHERE USER_ID = :user_id',
                    [pUserId],
                    { outFormat: OracleDB.OUT_FORMAT_OBJECT }
                );
    
                const balance = walletBalance.rows[0].BALANCE;

                if (balance >= pBetAmount) {
                    await connection.execute(
                        'INSERT INTO BETS (BET_ID, USER_ID, EVENT_ID, BET_AMOUNT, DATE_, TEAM_SELECTED) VALUES (SEQ_BETS.NEXTVAL, :userId, :eventId, :betAmount, SYSDATE, :team_selected)',
                        [pUserId, pEventId, pBetAmount, pBetTeam],
                        { autoCommit: true }
                    );

                    await connection.execute(
                        'UPDATE WALLETS SET BALANCE = :balance WHERE USER_ID = :user_id',
                        [(balance-pBetAmount), pUserId],
                        { autoCommit: true }
                    );
                }
        
                res.status(200).send(`Aposta de R$${pBetAmount} realizada com sucesso no evento ${pEventId}. Saldo atual: R$${balance-pBetAmount}`);
                } catch (error) {
                    console.error('Erro ao realizar aposta:', error);
                    res.status(500).send("Erro ao realizar aposta.");
                } finally {
                    if (connection) {
                        await connection.close();
                    }
                }

        } else {
            res.status(400).send("Parâmetros inválidos ou faltantes.");
        }
    };

    // Rota para encerrar um evento e distribuir os ganhos (acessível apenas por moderadores)
    export const finishEventRoute: RequestHandler = async (req: Request, res: Response) => {
        const pEmail = req.get('email');
        const pEventId = req.get('eventId');
        const pResult = req.get('result');

        if (!pEmail || !pEventId || !pResult) {
            res.status(400).send("Parâmetros inválidos ou faltantes.");
            return;
        }

        let connection;
        try {
            connection = await OracleDB.getConnection({
                user: process.env.ORACLE_USER,
                password: process.env.ORACLE_PASSWORD,
                connectString: process.env.ORACLE_CONN_STR
            });

            const moderatorCheck: any = await connection.execute(
                'SELECT USER_TYPE FROM ACCOUNTS WHERE EMAIL = :email',
                [pEmail],
                { outFormat: OracleDB.OUT_FORMAT_OBJECT }
            );

            if (!moderatorCheck.rows || moderatorCheck.rows[0].USER_TYPE !== 'moderator') {
                res.status(403).send("Acesso negado. Apenas moderadores podem encerrar eventos.");
                return;
            }

            const bets: any = await connection.execute(
                'SELECT USER_ID, TEAM_SELECTED, BET_AMOUNT FROM BETS WHERE EVENT_ID = :eventId',
                [pEventId],
                { outFormat: OracleDB.OUT_FORMAT_OBJECT }
            );

            for (const bet of bets.rows) {
                const reward = Number(pResult) === Number(bet.TEAM_SELECTED) ? bet.BET_AMOUNT * 2 : 0;
                if (reward > 0) {
                    await connection.execute(
                        'UPDATE WALLETS SET BALANCE = BALANCE + :reward WHERE USER_ID = :userId',
                        { reward, userId: bet.USER_ID },
                        { autoCommit: true }
                    );
                }
            }
            
            await connection.execute(
                'DELETE FROM BETS WHERE EVENT_ID = :eventId',
                [pEventId],
                { autoCommit: true }
            );

            
            await connection.execute(
                'DELETE FROM EVENTS WHERE EVENT_ID = :eventId',
                [pEventId],
                { autoCommit: true }
            );

            res.status(200).send(`Evento ${pEventId} encerrado e ganhos distribuídos.`);
        } catch (error) {
            console.error('Erro ao encerrar evento:', error);
            res.status(500).send("Erro interno ao encerrar o evento.");
        } finally {
            if (connection) await connection.close();
        }
    };

}