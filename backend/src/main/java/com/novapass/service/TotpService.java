package com.novapass.service;

import dev.samstevens.totp.code.*;
import dev.samstevens.totp.qr.QrData;
import dev.samstevens.totp.qr.QrDataFactory;
import dev.samstevens.totp.secret.DefaultSecretGenerator;
import dev.samstevens.totp.time.SystemTimeProvider;
import org.springframework.stereotype.Service;

@Service
public class TotpService {

    private final DefaultSecretGenerator secretGenerator = new DefaultSecretGenerator(32);
    private final CodeVerifier verifier;
    private final QrDataFactory qrDataFactory;

    public TotpService() {
        CodeGenerator codeGenerator = new DefaultCodeGenerator(HashingAlgorithm.SHA1, 6);
        this.verifier = new DefaultCodeVerifier(codeGenerator, new SystemTimeProvider());
        this.qrDataFactory = new QrDataFactory(HashingAlgorithm.SHA1, 6, 30);
    }

    public String generateSecret() {
        return secretGenerator.generate();
    }

    public boolean verify(String secret, String code) {
        return verifier.isValidCode(secret, code);
    }

    public String getQrCodeUri(String email, String secret) {
        QrData data = qrDataFactory.newBuilder()
            .label(email)
            .secret(secret)
            .issuer("NovaPass")
            .build();
        return data.getUri();
    }
}
