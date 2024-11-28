import { Request, Response, RequestHandler, response } from "express";
import OracleDB from "oracledb";
import dotenv from 'dotenv'; 
import {resolve} from 'path';
import nodemailer from 'nodemailer';

dotenv.config({ path: resolve('C:/workspace/outros/.env') });

export namespace EventsHandler {
    const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS
        }
    });

    const sendRejectionEmail = async (email: string, eventTitle: string, reason: string) => {
        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: email,
            subject: 'Evento Rejeitado',
            text: `O evento "${eventTitle}" foi rejeitado.\nMotivo: ${reason}.`
        };
    
        try {
            await transporter.sendMail(mailOptions);
            console.log(`Email de rejeição enviado para ${email}`);
        } catch (error) {
            console.error("Erro ao enviar email de rejeição: ", error);
        }
    };

    // Rota para adicionar um novo evento
    export const addEventRoute: RequestHandler = async (req: Request, res: Response) => {
        const { email, event_name, event_description, team1, team2, date1, date2, categoria } = req.body;

        //console.log({ pTitle, pDescription, pTeam1, pTeam2, pEmail, pCategoria});

        if (event_name && event_description && team1 && team2 && date1 && date2 && email && categoria) {
            let connection;
            try {
                connection = await OracleDB.getConnection({
                    user: process.env.ORACLE_USER,
                    password: process.env.ORACLE_PASSWORD,
                    connectString: process.env.ORACLE_CONN_STR
                });

                await connection.execute(
                    `INSERT INTO EVENTS (EVENT_ID, EVENT_NAME, DESCRICAO, TEAM1, TEAM2, EVENT_DATE_INICIO, EVENT_DATE_FIM, EMAIL, CATEGORIA) 
                    VALUES (SEQ_EVENTS.NEXTVAL, :p_event_name, :p_description, :p_team1, :p_team2,
                     TO_DATE(:p_date_inicio, 'YYYY-MM-DD'), TO_DATE(:p_date_fim, 'YYYY-MM-DD'), :p_user_email, :p_categoria)`,
                    {
                        p_event_name: event_name,
                        p_description: event_description,
                        p_team1: team1,
                        p_team2: team2,
                        p_date_inicio: date1,
                        p_date_fim: date2,
                        p_user_email: email,
                        p_categoria: categoria
                    },
                    { autoCommit: true }
                );

                res.status(200).send(`Novo evento '${event_name}' enviado com sucesso.`);
            } catch (error: any) {
                console.error(error);
                res.status(500).send(`Erro ao adicionar novo evento: ${error.message}`);
            } finally {
                if (connection) {
                    await connection.close();
                }
            }
        } else {
            res.status(400).send("Parâmetros inválidos ou faltantes.");
        }
    };

    // Rota para obter todos os eventos armazenados
    export const getEventsRoute: RequestHandler = async (req: Request, res: Response) => {
        let connection;
        try {
            connection = await OracleDB.getConnection({
                user: process.env.ORACLE_USER,
                password: process.env.ORACLE_PASSWORD,
                connectString: process.env.ORACLE_CONN_STR
            });
    
            // Busca todos os eventos do banco de dados
            const eventsResult: any = await connection.execute(
                "SELECT * FROM EVENTS WHERE STATUS_ = 'approved'",
                [],
                { outFormat: OracleDB.OUT_FORMAT_OBJECT }
            );
    
            if (eventsResult.rows.length === 0) {
                res.status(200).json({ message: "Nenhum evento encontrado." });
            } else {
                res.status(200).json({ events: eventsResult.rows });
            }
        } catch (error) {
            console.error('Erro ao buscar eventos:', error);
            res.status(500).json({ message: "Erro ao buscar eventos." });
        } finally {
            if (connection) {
                await connection.close();
            }
        }
    };
    

    // Rota para deletar um evento pelo índice fornecido
    export const deleteEventsRoute: RequestHandler = async (req: Request, res: Response) => {
        const pEventId = req.get('eventId');
        

        if (!pEventId) {
            res.status(400).send("ID do evento não fornecido.");
            return;
        }

        let connection;
        try {
            connection = await OracleDB.getConnection({
                user: process.env.ORACLE_USER,
                password: process.env.ORACLE_PASSWORD,
                connectString: process.env.ORACLE_CONN_STR
            });

            const result: any = await connection.execute(
                'DELETE FROM EVENTS WHERE EVENT_ID = :pEventId',
                [pEventId],
                { autoCommit: true }
            );

            if (result.rowsAffected === 0) {
                res.status(404).send("Evento não encontrado.");
            } else {
                res.status(200).send(`Evento com ID ${pEventId} deletado com sucesso.`);
            }
        } catch (error) {
            res.status(500).send("Erro ao deletar evento.");
        } finally {
            if (connection) {
                await connection.close();
            }
        }
    };

    // Rota para avaliar um evento novo
    export const evaluateNewEventRoute: RequestHandler = async (req: Request, res: Response) => {
        const pEmail = req.get('email');
        const pEventId = req.get('eventId');
        const pAction = req.get('action');
        const pReason = req.get('reason')
    
        if (!pEmail || !pEventId || !pAction) {
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
    
            const moderatorResult: any = await connection.execute(
                `SELECT USER_TYPE FROM ACCOUNTS WHERE EMAIL = :pEmail`,
                [pEmail],
                { outFormat: OracleDB.OUT_FORMAT_OBJECT }
            );
    
            if (moderatorResult.rows.length === 0 || moderatorResult.rows[0].USER_TYPE !== 'moderator') {
                res.status(403).send("Acesso negado. Apenas moderadores podem avaliar eventos.");
                return;
            };
    
            const eventDetails: any = await connection.execute(
                'SELECT EMAIL, EVENT_NAME FROM EVENTS WHERE EVENT_ID = :pEventId',
                [pEventId],
                { outFormat: OracleDB.OUT_FORMAT_OBJECT }
            );
            
            let rejectionReason: any = "";
            if (pReason === "1") {
                rejectionReason = "Texto confuso";
            } else if (pReason === "2") {
                rejectionReason = "Texto inapropriado";
            } else if (pReason === "3") {
                rejectionReason = "Não respeita a política de privacidade e/ou termos de uso da plataforma";
            } else {
                rejectionReason = pReason;
            }

            let status;
            if (pAction === 'approve') {
                status = 'approved';
            } else if (pAction === 'reject') {
                status = 'rejected';
            } else {
                res.status(400).send("Ação inválida. Use 'approve' ou 'reject'.");
                return;
            }
    
            await connection.execute(
                'UPDATE EVENTS SET STATUS_ = :status WHERE EVENT_ID = :pEventId',
                [status, pEventId],
                { autoCommit: true }
            );
    
            if (status === 'rejected') {
                await sendRejectionEmail(eventDetails.rows[0].EMAIL, eventDetails.rows[0].EVENT_NAME, rejectionReason);
            }
    
            res.status(200).send(`Evento ${pEventId} foi ${status} com sucesso.`);
        } 
        catch (error) {
            console.error('Erro ao avaliar evento:', error);
            res.status(500).send("Erro ao avaliar evento.");
        }
        finally {
            if (connection) {
                await connection.close();
            }
        }
    }
    
    // Função para buscar eventos por palavra-chave no banco de dados Oracle
    export const searchEventRoute: RequestHandler = async (req: Request, res: Response) => {
        const keyword = req.get('keyword');

        if (!keyword) {
            res.statusCode = 400;
            res.send("Você precisa informar uma palavra-chave para a busca.");
            return;
        }

        OracleDB.outFormat = OracleDB.OUT_FORMAT_OBJECT;

        const connection = await OracleDB.getConnection({
            user: process.env.ORACLE_USER,
            password: process.env.ORACLE_PASSWORD,
            connectString: process.env.ORACLE_CONN_STR
        });

        // Busca eventos que tenham a palavra-chave no título ou descrição
        const result: any = await connection.execute(
            `SELECT * FROM EVENTS WHERE LOWER(EVENT_NAME) LIKE :keyword OR LOWER(DESCRICAO) LIKE :keyword`,
            [ `%${keyword.toLowerCase()}%`, `%${keyword.toLowerCase()}%` ]
        );
        
        await connection.close(); 

        if (result.rows.length > 0) {
            let eventsList = '';
            
            // Percorre todos os eventos encontrados e formata as informações
            for (let i = 0; i < result.rows.length; i++) {
                const row = result.rows[i];
                eventsList += `Evento ${i + 1}:
                                ` +`Título: ${row.EVENT_NAME}
                                ` +`Descrição: ${row.DESCRIPTION}
                                ` +`Time 1: ${row.TEAM1}
                                ` +`Time 2: ${row.TEAM2}
                                ` +`Data: ${row.EVENT_DATE}            
                `;
            }
            
            res.statusCode = 200;
            res.send(eventsList); // Retorna os eventos encontrados cada um como uma stringzona como ali em cima 
            } 
            
            else {
                res.statusCode = 200;
                res.send("Nenhum evento foi encontrado que contém essa palavra.");
            }
    }
};