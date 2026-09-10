package com.sobi.auth.service;

import com.sobi.global.exception.BusinessException;
import com.sobi.global.exception.ErrorCode;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.mail.MailException;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;

@Slf4j
@Service
@RequiredArgsConstructor
public class MailService {

    private final JavaMailSender javaMailSender;

    public void sendVerificationMail(String to, String code) {

        SimpleMailMessage message = new SimpleMailMessage();

        message.setTo(to);
        message.setSubject("[SOBI] 이메일 인증번호");
        message.setText("인증번호: " + code + "\n 5분 이내에 입력해주세요.");

        try {
            javaMailSender.send(message);
        } catch (MailException e) {
            log.error("메일 발송 실패. to={}, message={}", to, e.getMessage());
            throw new BusinessException(ErrorCode.MAIL_SEND_FAILED);
        }
    }
}
