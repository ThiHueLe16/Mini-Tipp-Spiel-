package com.check24.minitippspiel.controller;

import com.check24.minitippspiel.dto.TrikotClaimRequestDto;
import com.check24.minitippspiel.service.TrikotClaimService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/v1/trikot")
@RequiredArgsConstructor
public class TrikotClaimController {

    private final TrikotClaimService trikotClaimService;

    @PostMapping("/claim")
    public ResponseEntity<Map<String, Object>> claimTrikot(@RequestBody TrikotClaimRequestDto dto) {
        trikotClaimService.claimTrikot(dto);

        return ResponseEntity.ok(Map.of(
                "success", true,
                "message", "Trikot successfully claimed and saved to database!"
        ));
    }
}