package com.check24.minitippspiel.service;

import com.check24.minitippspiel.dto.TrikotClaimRequestDto;
import com.check24.minitippspiel.model.User;
import com.check24.minitippspiel.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class TrikotClaimService {

    private final QueueService queueService;
    private final UserRepository userRepository;

    @Transactional
    public void claimTrikot(TrikotClaimRequestDto dto) {
        // 1. Fetch user from PostgreSQL
        User user = userRepository.findById(dto.userId())
                .orElseThrow(() -> new IllegalArgumentException("User not found: " + dto.userId()));

        // 2. Prevent double claiming in database
        if (user.getHasClaimedTrikot()) {
            throw new IllegalStateException("User has already claimed a Trikot!");
        }

        // 3. Atomically validate token and decrement stock in Redis
        boolean isTokenValid = queueService.validateAndClaimTrikot(
                String.valueOf(dto.userId()),
                dto.queuePassToken()
        );

        if (!isTokenValid) {
            throw new IllegalStateException("Invalid pass token or promotion is out of stock!");
        }

        // 4. Record shipping details in PostgreSQL
        user.setShippingAddress(dto.shippingAddress());
        user.setTrikotSize(dto.trikotSize());
        user.setHasClaimedTrikot(true);

        userRepository.save(user);
    }
}